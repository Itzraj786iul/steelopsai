"""
Phase 31 — Experimental Industrial Recipe Optimizer V2
Planning-safe: never optimizes EE_KWH (POWER), final TTT, or post-heat outcomes.
Uses frozen Phase 19 model for evaluation only.
"""

from __future__ import annotations

import copy
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from phase31_config import (
    ADJUSTMENT,
    OUTCOME_VARS,
    PHASE20_ROOT,
    PHASE21_ROOT,
    PLANNING_DECISION_VARS,
)
from explanation_engine import confidence_from_score, format_explanation
from industrial_rules import IndustrialRuleEngine
from multi_objective_scoring import MultiObjectiveScorer
from physics_constraints import PhysicsConstraintEngine, total_charge

# Phase 19 prediction (read-only) — phase21 must precede phase20 on sys.path
if str(PHASE21_ROOT) not in sys.path:
    sys.path.insert(0, str(PHASE21_ROOT))
from prediction_engine import PredictionEngine  # noqa: E402

# Phase 20 operating windows (append so phase21 feature_engineering wins)
if str(PHASE20_ROOT) not in sys.path:
    sys.path.append(str(PHASE20_ROOT))
from recipe_optimizer import compute_operating_windows, load_historical_data  # noqa: E402


@dataclass
class RankedRecommendation:
    rank: int
    recipe: dict[str, Any]
    predicted_ttt: float
    improvement_min: float
    industrial_score: float
    physics_score: float
    historical_similarity_pct: float
    stability: float
    confidence: str
    rules_satisfied: int
    rules_violated: int
    physics_feasible: bool
    objective_breakdown: dict[str, Any]
    explanation: dict[str, Any]
    physics_violations: list[str] = field(default_factory=list)


@dataclass
class OptimizerV2Result:
    current_recipe: dict[str, Any]
    current_ttt: float
    recommendations: list[RankedRecommendation]
    diagnostics: dict[str, Any]
    best: RankedRecommendation | None = None


class ExperimentalOptimizerV2:
    """Physics-constrained, multi-objective planning optimizer."""

    def __init__(self, n_generate: int = 800, seed: int = 42) -> None:
        self.n_generate = n_generate
        self.rng = np.random.default_rng(seed)
        self.predictor = PredictionEngine()
        hist = load_historical_data()
        self.hist_df = hist
        self.windows = compute_operating_windows(hist)
        self.physics = PhysicsConstraintEngine(self.windows)
        self.rules = IndustrialRuleEngine()

        matrix = hist[PLANNING_DECISION_VARS].to_numpy(dtype=float)
        self.hist_mean = matrix.mean(axis=0)
        self.hist_std = matrix.std(axis=0)
        self.hist_std[self.hist_std < 1e-6] = 1.0
        dists = []
        for i in range(len(matrix)):
            z = (matrix[i] - self.hist_mean) / self.hist_std
            dists.append(float(np.linalg.norm(z)))
        self.extreme_threshold = float(np.percentile(dists, 95))

        self.scorer = MultiObjectiveScorer(
            matrix, self.hist_mean, self.hist_std, self.extreme_threshold
        )

    def _normalize_recipe(self, recipe: dict[str, Any]) -> dict[str, Any]:
        r = copy.deepcopy(recipe)
        r.setdefault("Shift", "B")
        r.setdefault("Power_Restriction", 0)
        r.setdefault("Transformer_Tap", r.get("Transformer_Tap", 0))
        for c in PLANNING_DECISION_VARS + OUTCOME_VARS:
            r[c] = float(r.get(c, 0) or 0)
        return r

    def _recipe_for_prediction(self, candidate: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
        """Planning candidate + fixed outcome vars for frozen Phase 19 model."""
        r = self._normalize_recipe(candidate)
        for out in OUTCOME_VARS:
            r[out] = float(current[out])  # EE_KWH held — not optimized
        r["Shift"] = current.get("Shift", r.get("Shift", "B"))
        r["Power_Restriction"] = int(current.get("Power_Restriction", 0))
        return r

    def _perturb(self, current: dict[str, Any]) -> dict[str, Any]:
        c = self._normalize_recipe(current)
        cfg = ADJUSTMENT
        cand = copy.deepcopy(c)

        # HM move triggers compensating DRI
        hm_delta = self.rng.uniform(-cfg["HM_pct"], cfg["HM_pct"]) * max(c["HM"], 1)
        cand["HM"] = max(0, c["HM"] + hm_delta)
        dri_delta = -hm_delta * self.rng.uniform(0.7, 1.0) + self.rng.uniform(
            -cfg["DRI_pct"], cfg["DRI_pct"]
        ) * max(c["DRI"], 1)
        cand["DRI"] = max(0, c["DRI"] + dri_delta)

        cand["HBI"] = max(0, c["HBI"] + self.rng.uniform(-cfg["HBI_abs"], cfg["HBI_abs"]))
        cand["Bucket"] = max(0, c["Bucket"] + self.rng.uniform(-cfg["Bucket_abs"], cfg["Bucket_abs"]))
        cand["LIME"] = max(0, c["LIME"] * (1 + self.rng.uniform(-cfg["LIME_pct"], cfg["LIME_pct"])))
        cand["DOLO"] = max(0, c["DOLO"] * (1 + self.rng.uniform(-cfg["DOLO_pct"], cfg["DOLO_pct"])))
        cand["CPC"] = max(0, c["CPC"] * (1 + self.rng.uniform(-cfg["CPC_pct"], cfg["CPC_pct"])))
        cand["OXY"] = max(0, c["OXY"] * (1 + self.rng.uniform(-cfg["OXY_pct"], cfg["OXY_pct"])))

        # Never touch POWER in candidate
        for out in OUTCOME_VARS:
            cand[out] = c[out]
        return cand

    def _similarity_pct(self, candidate: dict[str, Any]) -> float:
        vec = np.array([candidate[v] for v in PLANNING_DECISION_VARS], dtype=float)
        z = (vec - self.hist_mean) / self.hist_std
        dist = float(np.linalg.norm(z))
        return max(0.0, min(100.0, 100.0 * (1.0 - dist / max(self.extreme_threshold, 1e-6))))

    def _supporting_heats(self, candidate: dict[str, Any], k: int = 3) -> list[str]:
        vec = np.array([candidate[v] for v in PLANNING_DECISION_VARS], dtype=float)
        matrix = self.hist_df[PLANNING_DECISION_VARS].to_numpy(dtype=float)
        diff = (matrix - self.hist_mean) / self.hist_std - (vec - self.hist_mean) / self.hist_std
        dists = np.sqrt((diff * diff).sum(axis=1))
        order = np.argsort(dists)[:k]
        return [str(self.hist_df.iloc[i]["Heat Number"]) for i in order]

    def optimize(self, current_recipe: dict[str, Any]) -> OptimizerV2Result:
        current = self._normalize_recipe(current_recipe)
        pred_recipe = self._recipe_for_prediction(current, current)
        current_ttt = self.predictor.predict(pred_recipe)
        power_restricted = bool(int(current.get("Power_Restriction", 0)))

        feasible: list[dict[str, Any]] = []
        rejection_counts: dict[str, int] = {}

        for _ in range(self.n_generate):
            cand = self._perturb(current)
            phys = self.physics.check(cand, current, power_restricted=power_restricted)
            if not phys.feasible:
                for v in phys.violations:
                    key = v.split(":")[0]
                    rejection_counts[key] = rejection_counts.get(key, 0) + 1
                continue

            pred_input = self._recipe_for_prediction(cand, current)
            pred_ttt = self.predictor.predict(pred_input)
            rule_trace = self.rules.evaluate(cand, current, phys.violations)

            obj = self.scorer.score(
                candidate=cand,
                current=current,
                current_ttt=current_ttt,
                predicted_ttt=pred_ttt,
                rule_violations=rule_trace.violated,
                physics_violations=len(phys.violations),
            )

            sim_pct = self._similarity_pct(cand)
            conf = confidence_from_score(
                obj.improvement_min, rule_trace.violated, sim_pct, phys.feasible
            )
            expl = format_explanation(
                current=current,
                candidate=cand,
                current_ttt=current_ttt,
                predicted_ttt=pred_ttt,
                confidence=conf,
                rule_trace=rule_trace,
                supporting_heats=self._supporting_heats(cand),
            )

            feasible.append(
                {
                    "recipe": cand,
                    "predicted_ttt": pred_ttt,
                    "improvement": obj.improvement_min,
                    "obj": obj,
                    "phys": phys,
                    "rule_trace": rule_trace,
                    "sim_pct": sim_pct,
                    "confidence": conf,
                    "explanation": expl,
                }
            )

        if not feasible:
            return OptimizerV2Result(
                current_recipe=current,
                current_ttt=current_ttt,
                recommendations=[],
                diagnostics={
                    "feasible_count": 0,
                    "rejection_counts": rejection_counts,
                    "message": "No feasible planning candidates — hold current practice",
                },
            )

        feasible.sort(key=lambda x: x["obj"].total_score)
        unique: list[dict[str, Any]] = []
        for item in feasible:
            is_dup = False
            for u in unique:
                if all(abs(item["recipe"][v] - u["recipe"][v]) < 0.25 for v in ["HM", "DRI", "Bucket"]):
                    is_dup = True
                    break
            if not is_dup:
                unique.append(item)
            if len(unique) >= 15:
                break

        top = unique[:5]
        hm_spread = max(r["recipe"]["HM"] for r in top) - min(r["recipe"]["HM"] for r in top) if len(top) > 1 else 0

        recommendations: list[RankedRecommendation] = []
        for rank, item in enumerate(top, start=1):
            obj = item["obj"]
            recommendations.append(
                RankedRecommendation(
                    rank=rank,
                    recipe=item["recipe"],
                    predicted_ttt=item["predicted_ttt"],
                    improvement_min=item["improvement"],
                    industrial_score=round(obj.burden_change_term * 10, 3),
                    physics_score=round(len(item["phys"].violations), 3),
                    historical_similarity_pct=round(item["sim_pct"], 1),
                    stability=round(max(0, 100 - hm_spread * 15), 1),
                    confidence=item["confidence"],
                    rules_satisfied=item["rule_trace"].satisfied,
                    rules_violated=item["rule_trace"].violated,
                    physics_feasible=item["phys"].feasible,
                    objective_breakdown={
                        "total_score": obj.total_score,
                        "contributions": obj.contributions,
                        "weights": obj.weights,
                    },
                    explanation=item["explanation"],
                    physics_violations=item["phys"].violations,
                )
            )

        return OptimizerV2Result(
            current_recipe=current,
            current_ttt=current_ttt,
            recommendations=recommendations,
            best=recommendations[0] if recommendations else None,
            diagnostics={
                "feasible_count": len(feasible),
                "unique_count": len(unique),
                "rejection_counts": rejection_counts,
                "power_optimized": False,
                "outcome_vars_fixed": OUTCOME_VARS,
            },
        )


def optimize_recipe_v2(recipe: dict[str, Any], n_generate: int = 800) -> OptimizerV2Result:
    return ExperimentalOptimizerV2(n_generate=n_generate).optimize(recipe)
