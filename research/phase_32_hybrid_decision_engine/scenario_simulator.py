"""Operator scenario analysis — human override simulation."""

from __future__ import annotations

import copy
from typing import Any, Callable

from phase32_config import OUTCOME_VARS


def _predict_ttt(predict_fn: Callable[[dict], float], recipe: dict[str, Any]) -> float:
    r = copy.deepcopy(recipe)
    r.setdefault("Power_Restriction", 0)
    r.setdefault("Shift", "B")
    return float(predict_fn(r))


def run_scenarios(
    current: dict[str, Any],
    predict_fn: Callable[[dict], float],
) -> list[dict[str, Any]]:
    """Part 9 — what-if operator ignores or applies partial recommendations."""
    base_ttt = _predict_ttt(predict_fn, current)
    scenarios: list[dict[str, Any]] = []

    def add(name: str, modified: dict[str, Any], note: str) -> None:
        for out in OUTCOME_VARS:
            modified[out] = current[out]
        ttt = _predict_ttt(predict_fn, modified)
        scenarios.append(
            {
                "scenario": name,
                "note": note,
                "baseline_ttt": round(base_ttt, 3),
                "scenario_ttt": round(ttt, 3),
                "delta_ttt": round(ttt - base_ttt, 3),
            }
        )

    # Keep HM unchanged — only adjust DRI per physics trade
    r1 = copy.deepcopy(current)
    r1["DRI"] = min(current["DRI"] + 1.2, current["DRI"] + (current["HM"] * 0.02))
    add("Operator keeps HM unchanged", r1, "Increase DRI only to absorb solid burden")

    # Lime only
    r2 = copy.deepcopy(current)
    r2["LIME"] = current["LIME"] * 1.05
    add("Operator increases Lime only", r2, "Flux adjustment without burden change")

    # DRI only
    r3 = copy.deepcopy(current)
    r3["DRI"] = current["DRI"] + 1.0
    add("Operator changes only DRI", r3, "+1.0 t DRI")

    # Ignore all — hold recipe
    add("Operator holds current recipe", copy.deepcopy(current), "No changes")

    # Bucket only
    r5 = copy.deepcopy(current)
    r5["Bucket"] = max(0, current["Bucket"] - 1.0)
    add("Operator reduces scrap 1t", r5, "Bucket reduction only")

    return scenarios
