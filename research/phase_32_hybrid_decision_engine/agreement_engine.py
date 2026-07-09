"""Recommendation agreement — Physics vs ML vs Historical vs Operator."""

from __future__ import annotations

from typing import Any

import numpy as np

from phase32_config import KEY_AGREEMENT_VARS


def _direction(delta: float, threshold: float = 0.05) -> str:
    if abs(delta) < threshold:
        return "Maintain"
    return "Increase" if delta > 0 else "Reduce"


def physics_recommendation(current: dict[str, Any], candidate: dict[str, Any]) -> dict[str, str]:
    """Physics-led direction from HM–DRI coupling and flux rules."""
    rec: dict[str, str] = {}
    hm_d = candidate["HM"] - current["HM"]
    dri_d = candidate["DRI"] - current["DRI"]
    if hm_d < -0.1:
        rec["HM"] = "Reduce"
        rec["DRI"] = "Increase" if dri_d > 0 else "Maintain"
    elif hm_d > 0.1:
        rec["HM"] = "Increase"
        rec["DRI"] = "Reduce" if dri_d < 0 else "Maintain"
    else:
        rec["HM"] = "Maintain"
        rec["DRI"] = _direction(dri_d, 0.3)
    for v in ["Bucket", "OXY", "CPC", "LIME", "DOLO"]:
        rec[v] = _direction(candidate[v] - current[v], 0.2 if v in ("LIME", "DOLO") else 0.5)
    return rec


def ml_recommendation(current: dict[str, Any], candidate: dict[str, Any]) -> dict[str, str]:
    return {v: _direction(candidate[v] - current[v], 0.1 if v in ("HM", "DRI") else 0.3) for v in KEY_AGREEMENT_VARS}


def historical_recommendation(
    current: dict[str, Any],
    similar_recipe: dict[str, Any],
) -> dict[str, str]:
    """Direction toward nearest successful historical heat."""
    return {v: _direction(similar_recipe[v] - current[v], 0.5) for v in KEY_AGREEMENT_VARS}


def operator_recommendation(current: dict[str, Any]) -> dict[str, str]:
    """JSPL operator baseline — conservative, maintain unless burden imbalanced."""
    charge = current["HM"] + current["DRI"] + current.get("HBI", 0) + current.get("Bucket", 0)
    rec = {v: "Maintain" for v in KEY_AGREEMENT_VARS}
    if current["HM"] > 62 and current["DRI"] < 50:
        rec["DRI"] = "Increase"
        rec["HM"] = "Reduce"
    if charge < 110:
        rec["DRI"] = "Increase"
    return rec


def agreement_score(
    physics: dict[str, str],
    ml: dict[str, str],
    historical: dict[str, str],
    operator: dict[str, str],
) -> dict[str, Any]:
    """Part 6 — agreement % across four recommendation sources."""
    sources = {"Physics": physics, "ML": ml, "Historical": historical, "Operator": operator}
    per_var: dict[str, float] = {}
    details: list[dict[str, str]] = []

    for var in KEY_AGREEMENT_VARS:
        dirs = [sources[s].get(var, "Maintain") for s in sources]
        mode_count = max(dirs.count(d) for d in set(dirs))
        per_var[var] = round(100 * mode_count / 4, 0)
        details.append({"variable": var, **{f"{k}_says": v for k, v in zip(sources.keys(), dirs)}})

    overall = float(np.mean(list(per_var.values())))
    return {
        "agreement_pct": round(overall, 1),
        "per_variable": per_var,
        "details": details,
        "physics": physics,
        "ml": ml,
        "historical": historical,
        "operator": operator,
    }
