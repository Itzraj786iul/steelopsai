"""Explanation engine V2 — metallurgical causal chains."""

from __future__ import annotations

from typing import Any

from phase31_config import LITERATURE_REFS
from industrial_rules import RuleTrace


def format_explanation(
    *,
    current: dict[str, Any],
    candidate: dict[str, Any],
    current_ttt: float,
    predicted_ttt: float,
    confidence: str,
    rule_trace: RuleTrace,
    supporting_heats: list[str],
) -> dict[str, Any]:
    improvement = current_ttt - predicted_ttt
    lines: list[str] = ["Current Recipe"]

    hm_d = candidate["HM"] - current["HM"]
    dri_d = candidate["DRI"] - current["DRI"]
    if abs(hm_d) > 0.05:
        lines.append(f"↓\n{'Reduce' if hm_d < 0 else 'Increase'} HM by {abs(hm_d):.1f} t")
    if abs(dri_d) > 0.05:
        lines.append(f"↓\n{'Increase' if dri_d > 0 else 'Reduce'} DRI by {abs(dri_d):.1f} t")
    if abs(hm_d) > 0.05 or abs(dri_d) > 0.05:
        lines.append("↓\nMaintain total metallic burden")
    if abs(candidate["Bucket"] - current["Bucket"]) > 0.3:
        b_d = candidate["Bucket"] - current["Bucket"]
        lines.append(f"↓\nAdjust scrap bucket by {b_d:+.1f} t")
    if abs(candidate["OXY"] - current["OXY"]) > 20:
        lines.append("↓\nAdjust target oxygen program")
    if abs(candidate["CPC"] - current["CPC"]) > 15:
        lines.append("↓\nAdjust target carbon program")

    lines.append("↓\nImprove arc efficiency and melting path balance")
    lines.append(f"↓\nExpected TTT reduction: {improvement:.2f} min")
    lines.append(f"Confidence: {confidence}")

    narrative = "\n".join(lines)
    rule_lines = [f"{s.rule_id}: {s.description} [{s.status}]" for s in rule_trace.steps]

    return {
        "narrative": narrative,
        "narrative_lines": lines,
        "expected_saving_min": round(improvement, 3),
        "confidence": confidence,
        "historical_support": supporting_heats,
        "literature_support": list(dict.fromkeys(
            [LITERATURE_REFS["burden"], LITERATURE_REFS["oxygen"], LITERATURE_REFS["carbon"]]
        )),
        "rule_trace": rule_lines,
        "rules_satisfied": rule_trace.satisfied,
        "rules_violated": rule_trace.violated,
    }


def confidence_from_score(
    improvement: float,
    rule_violations: int,
    similarity_pct: float,
    physics_feasible: bool,
) -> str:
    if not physics_feasible or rule_violations > 2:
        return "Low"
    score = 70.0
    score += min(15, improvement * 8)
    score += min(10, similarity_pct / 10)
    score -= rule_violations * 12
    if score >= 78:
        return "High"
    if score >= 55:
        return "Medium"
    return "Low"
