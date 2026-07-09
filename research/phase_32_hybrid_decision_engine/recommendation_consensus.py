"""Recommendation consensus classification."""

from __future__ import annotations


def classify_consensus(agreement_pct: float, rules_violated: int, physics_feasible: bool) -> str:
    """Part 10 — Strong / Moderate / Weak / Conflict."""
    if not physics_feasible or rules_violated > 2:
        return "Conflict"
    if agreement_pct >= 85:
        return "Strong"
    if agreement_pct >= 65:
        return "Moderate"
    if agreement_pct >= 45:
        return "Weak"
    return "Conflict"


def consensus_narrative(
    consensus: str,
    physics_dirs: dict[str, str],
    ml_dirs: dict[str, str],
    hist_dirs: dict[str, str],
) -> list[str]:
    lines = [
        f"Physics says: HM {physics_dirs.get('HM','?')}, DRI {physics_dirs.get('DRI','?')}",
        f"ML says: HM {ml_dirs.get('HM','?')}, DRI {ml_dirs.get('DRI','?')}",
        f"History says: HM {hist_dirs.get('HM','?')}, DRI {hist_dirs.get('DRI','?')}",
        f"Consensus: {consensus}",
    ]
    return lines
