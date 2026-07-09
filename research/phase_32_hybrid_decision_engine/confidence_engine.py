"""Confidence engine — Physics, AI, and Industrial confidence (0–100)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from phase32_config import BURDEN_COLS, PLANNING_VARS, TEST_MAE, CI_HALF_WIDTH


def total_charge(recipe: dict[str, Any]) -> float:
    return float(sum(float(recipe.get(c, 0) or 0) for c in BURDEN_COLS))


def physics_confidence(
    current: dict[str, Any],
    candidate: dict[str, Any],
    *,
    physics_feasible: bool,
    physics_violations: list[str],
) -> dict[str, Any]:
    """Part 3 — Physics confidence from burden/flux/metallic/O2/C/charge checks."""
    scores: dict[str, float] = {}

    charge_c = total_charge(current)
    charge_n = total_charge(candidate)
    scores["burden_balance"] = max(0, 100 - abs(charge_n - charge_c) * 15)

    metallic_c = current["HM"] + current["DRI"]
    metallic_n = candidate["HM"] + candidate["DRI"]
    hm_d = candidate["HM"] - current["HM"]
    dri_d = candidate["DRI"] - current["DRI"]
    if hm_d * dri_d <= 0 or abs(hm_d) < 0.05:
        scores["metallic_balance"] = 95.0
    else:
        scores["metallic_balance"] = 40.0

    ratio_c = current["LIME"] / max(current["DOLO"], 0.1)
    ratio_n = candidate["LIME"] / max(candidate["DOLO"], 0.1)
    scores["flux_balance"] = max(0, 100 - abs(ratio_n - ratio_c) / max(ratio_c, 0.1) * 80)

    oxy_d = candidate["OXY"] - current["OXY"]
    if dri_d > 0 and oxy_d < -100:
        scores["oxygen_coordination"] = 45.0
    else:
        scores["oxygen_coordination"] = 90.0

    cpc_d = candidate["CPC"] - current["CPC"]
    if cpc_d > 0 and oxy_d < -50:
        scores["carbon_coordination"] = 50.0
    else:
        scores["carbon_coordination"] = 88.0

    scores["charge_feasibility"] = 100.0 if 80 <= charge_n <= 150 else 55.0

    overall = float(np.mean(list(scores.values())))
    if not physics_feasible:
        overall = min(overall, 45.0)
    overall -= min(30, len(physics_violations) * 8)

    return {
        "physics_confidence": round(max(0, min(100, overall)), 1),
        "components": {k: round(v, 1) for k, v in scores.items()},
    }


def ai_confidence(
    *,
    predicted_ttt: float,
    ci_lower: float,
    ci_upper: float,
    historical_similarity_pct: float,
    outlier_score: float,
    feature_density: float,
    model_confidence_tier: str = "Medium",
) -> dict[str, Any]:
    """Part 4 — AI confidence from uncertainty, similarity, outlier, density."""
    ci_width = ci_upper - ci_lower
    uncertainty = max(0, 100 - (ci_width / (2 * CI_HALF_WIDTH)) * 40)

    sim = min(100, historical_similarity_pct)
    outlier_penalty = min(40, outlier_score * 25)
    density = min(100, feature_density)

    tier_map = {"High": 85, "Medium": 65, "Low": 45, "Very Low": 25}
    model_base = tier_map.get(model_confidence_tier, 60)

    overall = (
        0.25 * uncertainty
        + 0.25 * sim
        + 0.20 * density
        + 0.15 * model_base
        + 0.15 * max(0, 100 - outlier_penalty)
    )
    return {
        "ai_confidence": round(max(0, min(100, overall)), 1),
        "prediction_uncertainty": round(uncertainty, 1),
        "historical_similarity": round(sim, 1),
        "outlier_penalty": round(outlier_penalty, 1),
        "feature_density": round(density, 1),
        "model_confidence_tier": model_confidence_tier,
    }


def industrial_confidence(
    *,
    rules_satisfied: int,
    rules_violated: int,
    historical_similarity_pct: float,
    constraint_violations: int,
    historical_success_rate: float = 0.75,
) -> dict[str, Any]:
    """Part 5 — Industrial confidence from rules, history, practice distance."""
    total_rules = max(rules_satisfied + rules_violated, 1)
    rule_score = 100 * rules_satisfied / total_rules
    hist_success = historical_success_rate * 100
    practice_dist = max(0, 100 - (100 - historical_similarity_pct) * 0.8)
    constraint_penalty = min(40, constraint_violations * 12)

    overall = (
        0.35 * rule_score
        + 0.25 * hist_success
        + 0.25 * practice_dist
        + 0.15 * max(0, 100 - constraint_penalty)
    )
    return {
        "industrial_confidence": round(max(0, min(100, overall)), 1),
        "rule_satisfaction_pct": round(rule_score, 1),
        "historical_success": round(hist_success, 1),
        "practice_distance_score": round(practice_dist, 1),
    }


def compute_outlier_score(recipe: dict[str, Any], hist_df: pd.DataFrame) -> float:
    m = hist_df[PLANNING_VARS].mean().to_numpy()
    s = hist_df[PLANNING_VARS].std().to_numpy()
    s[s < 1e-6] = 1.0
    vec = np.array([recipe[v] for v in PLANNING_VARS], dtype=float)
    z = (vec - m) / s
    return float(np.linalg.norm(z) / np.sqrt(len(PLANNING_VARS)))


def compute_feature_density(recipe: dict[str, Any], hist_df: pd.DataFrame, radius_pct: float = 95) -> float:
    m = hist_df[PLANNING_VARS].mean().to_numpy()
    s = hist_df[PLANNING_VARS].std().to_numpy()
    s[s < 1e-6] = 1.0
    vec = np.array([recipe[v] for v in PLANNING_VARS], dtype=float)
    z_query = (vec - m) / s
    matrix = hist_df[PLANNING_VARS].to_numpy(dtype=float)
    z_hist = (matrix - m) / s
    dists = np.linalg.norm(z_hist - z_query, axis=1)
    threshold = np.percentile(dists, radius_pct)
    neighbors = int((dists <= threshold).sum())
    return min(100, neighbors / 5)  # scale: 50 neighbors → 100
