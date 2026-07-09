"""Multi-objective scoring — Phase 31 optimizer V2."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from phase31_config import BURDEN_COLS, DEFAULT_OBJECTIVE_WEIGHTS, PLANNING_DECISION_VARS
from physics_constraints import total_charge


@dataclass
class ObjectiveBreakdown:
    predicted_ttt: float
    improvement_min: float
    ttt_term: float
    burden_change_term: float
    similarity_term: float
    rule_violation_term: float
    burden_balance_term: float
    stability_term: float
    total_score: float
    weights: dict[str, float] = field(default_factory=dict)
    contributions: dict[str, float] = field(default_factory=dict)


def burden_change_magnitude(current: dict[str, Any], candidate: dict[str, Any]) -> float:
    return float(
        sum(abs(candidate[v] - current[v]) for v in PLANNING_DECISION_VARS)
        / max(sum(abs(current[v]) for v in PLANNING_DECISION_VARS), 1e-6)
    )


def historical_distance(
    candidate: dict[str, Any],
    mean: np.ndarray,
    std: np.ndarray,
    matrix: np.ndarray,
) -> float:
    vec = np.array([candidate[v] for v in PLANNING_DECISION_VARS], dtype=float)
    normed = (vec - mean) / std
    # distance to nearest historical in planning space
    hist_norm = (matrix - mean) / std
    diff = hist_norm - normed
    return float(np.sqrt((diff * diff).sum(axis=1)).min())


class MultiObjectiveScorer:
    def __init__(
        self,
        hist_matrix: np.ndarray,
        hist_mean: np.ndarray,
        hist_std: np.ndarray,
        extreme_threshold: float,
        weights: dict[str, float] | None = None,
    ) -> None:
        self.matrix = hist_matrix
        self.mean = hist_mean
        self.std = hist_std
        self.extreme_threshold = extreme_threshold
        self.weights = dict(DEFAULT_OBJECTIVE_WEIGHTS)
        if weights:
            self.weights.update(weights)

    def score(
        self,
        *,
        candidate: dict[str, Any],
        current: dict[str, Any],
        current_ttt: float,
        predicted_ttt: float,
        rule_violations: int,
        physics_violations: int,
        stability_hint: float = 0.0,
    ) -> ObjectiveBreakdown:
        w = self.weights
        improvement = current_ttt - predicted_ttt

        ttt_term = predicted_ttt  # minimize
        burden_chg = burden_change_magnitude(current, candidate)
        burden_change_term = burden_chg

        dist = historical_distance(candidate, self.mean, self.std, self.matrix)
        similarity_term = dist / max(self.extreme_threshold, 1e-6)

        rule_violation_term = float(rule_violations + physics_violations)

        charge_delta = abs(total_charge(candidate) - total_charge(current))
        burden_balance_term = charge_delta / 5.0

        stability_term = stability_hint

        total = (
            w["ttt"] * ttt_term
            + w["burden_change"] * burden_change_term * 10
            + w["historical_similarity"] * similarity_term * 5
            + w["rule_violations"] * rule_violation_term * 3
            + w["burden_balance"] * burden_balance_term * 5
            + w["stability"] * stability_term
        )

        contributions = {
            "ttt": w["ttt"] * ttt_term,
            "burden_change": w["burden_change"] * burden_change_term * 10,
            "historical_similarity": w["historical_similarity"] * similarity_term * 5,
            "rule_violations": w["rule_violations"] * rule_violation_term * 3,
            "burden_balance": w["burden_balance"] * burden_balance_term * 5,
            "stability": w["stability"] * stability_term,
        }

        return ObjectiveBreakdown(
            predicted_ttt=predicted_ttt,
            improvement_min=improvement,
            ttt_term=ttt_term,
            burden_change_term=burden_change_term,
            similarity_term=similarity_term,
            rule_violation_term=rule_violation_term,
            burden_balance_term=burden_balance_term,
            stability_term=stability_term,
            total_score=float(total),
            weights=w,
            contributions=contributions,
        )
