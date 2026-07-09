"""
Phase 32 — Hybrid Physics + AI Decision Engine
Combines prediction, physics, industrial rules, historical similarity, risk, and operator preference.
Research only — does not modify production.
"""

from __future__ import annotations

import copy
import sys
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from phase32_config import (
    BURDEN_COLS,
    CI_HALF_WIDTH,
    HYBRID_WEIGHTS,
    OUTCOME_VARS,
    PHASE13_DATASET,
    PHASE20_ROOT,
    PHASE21_ROOT,
    PHASE31_ROOT,
    PLANNING_VARS,
    TEST_MAE,
)
from agreement_engine import (
    agreement_score,
    historical_recommendation,
    ml_recommendation,
    operator_recommendation,
    physics_recommendation,
)
from confidence_engine import (
    ai_confidence,
    compute_feature_density,
    compute_outlier_score,
    industrial_confidence,
    physics_confidence,
)
from recommendation_consensus import classify_consensus, consensus_narrative
from reliability_engine import reliability_index, reliability_tier
from scenario_simulator import run_scenarios

# Phase 31 V2 (read-only)
sys.path.insert(0, str(PHASE31_ROOT))
from experimental_optimizer_v2 import ExperimentalOptimizerV2  # noqa: E402

# Phase 19 prediction (read-only)
sys.path.insert(0, str(PHASE21_ROOT))
sys.path.append(str(PHASE20_ROOT))
from prediction_engine import PredictionEngine  # noqa: E402


@dataclass
class HybridDecisionResult:
    heat_id: str
    current_recipe: dict[str, Any]
    current_ttt: float
    recommended_recipe: dict[str, Any]
    predicted_ttt: float
    improvement_min: float
    hybrid_score: float
    score_breakdown: dict[str, float]
    physics_confidence: float
    ai_confidence: float
    industrial_confidence: float
    reliability_index: float
    reliability_tier: str
    agreement_pct: float
    consensus: str
    decision_tree: list[str]
    scenarios: list[dict[str, Any]] = field(default_factory=list)
    digital_twin: dict[str, Any] = field(default_factory=dict)
    top5: list[dict[str, Any]] = field(default_factory=list)


class HybridDecisionEngine:
    def __init__(self, n_generate: int = 500) -> None:
        self.predictor = PredictionEngine()
        self.optimizer_v2 = ExperimentalOptimizerV2(n_generate=n_generate)
        self.hist_df = pd.read_csv(PHASE13_DATASET)
        for c in PLANNING_VARS + ["TTT", "POWER"]:
            if c in self.hist_df.columns:
                self.hist_df[c] = pd.to_numeric(self.hist_df[c], errors="coerce")
        self.hist_df = self.hist_df.dropna(subset=["TTT"])

    def _predict(self, recipe: dict[str, Any]) -> tuple[float, float, float]:
        r = copy.deepcopy(recipe)
        for out in OUTCOME_VARS:
            if out not in r:
                r[out] = recipe.get(out, 0)
        r.setdefault("Shift", "B")
        r.setdefault("Power_Restriction", 0)
        pred = self.predictor.predict_with_interval(r)
        return pred.predicted_ttt, pred.ci_lower_95, pred.ci_upper_95

    def _nearest_historical(self, recipe: dict[str, Any]) -> dict[str, Any]:
        m = self.hist_df[PLANNING_VARS].mean().to_numpy()
        s = self.hist_df[PLANNING_VARS].std().to_numpy()
        s[s < 1e-6] = 1.0
        vec = np.array([recipe[v] for v in PLANNING_VARS], dtype=float)
        matrix = self.hist_df[PLANNING_VARS].to_numpy(dtype=float)
        dists = np.linalg.norm((matrix - m) / s - (vec - m) / s, axis=1)
        idx = int(np.argmin(dists))
        row = self.hist_df.iloc[idx]
        return {v: float(row[v]) for v in PLANNING_VARS}

    def _digital_twin_readiness(self, recipe: dict[str, Any], outlier: float) -> dict[str, Any]:
        """Part 11 — layered readiness scores."""
        pred_r = max(0, 100 - outlier * 20)
        opt_r = 85  # V2 available
        sensor = 35  # P0 gaps per Phase 27
        industrial = max(0, 100 - outlier * 25)
        overall = int(np.mean([pred_r, opt_r, sensor, industrial]))
        return {
            "prediction_readiness": round(pred_r, 1),
            "optimizer_readiness": opt_r,
            "sensor_completeness": sensor,
            "industrial_completeness": round(industrial, 1),
            "overall_digital_twin_readiness": overall,
            "tier": "Early" if overall < 50 else "Developing",
        }

    def _hybrid_score(
        self,
        *,
        improvement: float,
        physics_conf: float,
        industrial_conf: float,
        similarity_pct: float,
        risk_score: float,
        operator_pref: float,
    ) -> tuple[float, dict[str, float]]:
        w = HYBRID_WEIGHTS
        pred_component = min(100, max(0, 50 + improvement * 15))
        components = {
            "prediction_score": pred_component * w["prediction"],
            "physics_score": physics_conf * w["physics"],
            "industrial_rule_score": industrial_conf * w["industrial_rules"],
            "historical_similarity": similarity_pct * w["historical_similarity"],
            "risk_score": risk_score * w["risk"],
            "operator_preference": operator_pref * w["operator_preference"],
        }
        # Lower hybrid score is better (like Phase 20) — invert for display as 0-100 quality
        raw = sum(components.values())
        quality = round(max(0, min(100, raw)), 2)
        return quality, {k: round(v, 2) for k, v in components.items()}

    def _decision_tree(
        self,
        *,
        current_ttt: float,
        predicted_ttt: float,
        physics_conf: float,
        ai_conf: float,
        agreement_pct: float,
        consensus: str,
        reliability: float,
        improvement: float,
    ) -> list[str]:
        return [
            "Current Recipe",
            "↓\nPhysics Analysis",
            f"Physics confidence: {physics_conf:.0f}/100",
            "↓\nML Prediction",
            f"Current TTT: {current_ttt:.2f} min → Predicted: {predicted_ttt:.2f} min",
            f"AI confidence: {ai_conf:.0f}/100",
            "↓\nHistorical Comparison",
            f"Agreement across sources: {agreement_pct:.0f}%",
            "↓\nRule Evaluation",
            f"Consensus: {consensus}",
            "↓\nRisk Assessment",
            "↓\nFinal Recommendation",
            f"Expected improvement: {improvement:.2f} min",
            f"Reliability Index: {reliability:.0f}/100",
        ]

    def evaluate(self, recipe: dict[str, Any], heat_id: str = "") -> HybridDecisionResult:
        current = copy.deepcopy(recipe)
        current.setdefault("Shift", "B")
        current.setdefault("Power_Restriction", 0)

        opt = self.optimizer_v2.optimize(current)
        if not opt.best:
            cur_ttt, ci_l, ci_u = self._predict(current)
            outlier = compute_outlier_score(current, self.hist_df)
            dt = self._digital_twin_readiness(current, outlier)
            return HybridDecisionResult(
                heat_id=heat_id,
                current_recipe=current,
                current_ttt=cur_ttt,
                recommended_recipe=current,
                predicted_ttt=cur_ttt,
                improvement_min=0.0,
                hybrid_score=0.0,
                score_breakdown={},
                physics_confidence=0.0,
                ai_confidence=0.0,
                industrial_confidence=0.0,
                reliability_index=0.0,
                reliability_tier="Review Required",
                agreement_pct=0.0,
                consensus="Conflict",
                decision_tree=["No feasible hybrid recommendation — hold current practice"],
                scenarios=run_scenarios(current, lambda r: self._predict(r)[0]),
                digital_twin=dt,
            )

        best = opt.best
        candidate = best.recipe
        for out in OUTCOME_VARS:
            candidate[out] = current[out]

        cur_ttt, ci_l, ci_u = self._predict(current)
        pred_ttt, _, _ = self._predict(candidate)
        improvement = cur_ttt - pred_ttt

        phys = physics_confidence(
            current,
            candidate,
            physics_feasible=best.physics_feasible,
            physics_violations=best.physics_violations,
        )
        outlier = compute_outlier_score(current, self.hist_df)
        density = compute_feature_density(current, self.hist_df)
        ai = ai_confidence(
            predicted_ttt=pred_ttt,
            ci_lower=ci_l,
            ci_upper=ci_u,
            historical_similarity_pct=best.historical_similarity_pct,
            outlier_score=outlier,
            feature_density=density,
        )
        ind = industrial_confidence(
            rules_satisfied=best.rules_satisfied,
            rules_violated=best.rules_violated,
            historical_similarity_pct=best.historical_similarity_pct,
            constraint_violations=len(best.physics_violations),
        )

        similar = self._nearest_historical(current)
        agree = agreement_score(
            physics_recommendation(current, candidate),
            ml_recommendation(current, candidate),
            historical_recommendation(current, similar),
            operator_recommendation(current),
        )
        consensus = classify_consensus(agree["agreement_pct"], best.rules_violated, best.physics_feasible)

        risk_score = max(0, 100 - outlier * 30 - best.rules_violated * 10)
        op_dirs = operator_recommendation(current)
        ml_dirs = ml_recommendation(current, candidate)
        op_match = sum(1 for v in PLANNING_VARS[:5] if op_dirs.get(v) == ml_dirs.get(v)) / 5 * 100

        hybrid_q, breakdown = self._hybrid_score(
            improvement=improvement,
            physics_conf=phys["physics_confidence"],
            industrial_conf=ind["industrial_confidence"],
            similarity_pct=best.historical_similarity_pct,
            risk_score=risk_score,
            operator_pref=op_match,
        )

        rel = reliability_index(
            ai_confidence=ai["ai_confidence"],
            physics_confidence=phys["physics_confidence"],
            industrial_confidence=ind["industrial_confidence"],
            historical_similarity_pct=best.historical_similarity_pct,
            stability=best.stability,
            agreement_pct=agree["agreement_pct"],
        )
        tier = reliability_tier(rel["reliability_index"])

        tree = self._decision_tree(
            current_ttt=cur_ttt,
            predicted_ttt=pred_ttt,
            physics_conf=phys["physics_confidence"],
            ai_conf=ai["ai_confidence"],
            agreement_pct=agree["agreement_pct"],
            consensus=consensus,
            reliability=rel["reliability_index"],
            improvement=improvement,
        )

        scenarios = run_scenarios(current, lambda r: self._predict(r)[0])
        dt = self._digital_twin_readiness(current, outlier)

        top5 = [
            {
                "rank": r.rank,
                "predicted_ttt": r.predicted_ttt,
                "improvement_min": r.improvement_min,
                "reliability": reliability_index(
                    ai_confidence=ai["ai_confidence"],
                    physics_confidence=phys["physics_confidence"],
                    industrial_confidence=ind["industrial_confidence"],
                    historical_similarity_pct=r.historical_similarity_pct,
                    stability=r.stability,
                    agreement_pct=agree["agreement_pct"],
                )["reliability_index"],
                "confidence": r.confidence,
            }
            for r in opt.recommendations
        ]

        return HybridDecisionResult(
            heat_id=heat_id,
            current_recipe=current,
            current_ttt=round(cur_ttt, 3),
            recommended_recipe=candidate,
            predicted_ttt=round(pred_ttt, 3),
            improvement_min=round(improvement, 3),
            hybrid_score=hybrid_q,
            score_breakdown=breakdown,
            physics_confidence=phys["physics_confidence"],
            ai_confidence=ai["ai_confidence"],
            industrial_confidence=ind["industrial_confidence"],
            reliability_index=rel["reliability_index"],
            reliability_tier=tier,
            agreement_pct=agree["agreement_pct"],
            consensus=consensus,
            decision_tree=tree,
            scenarios=scenarios,
            digital_twin=dt,
            top5=top5,
        )
