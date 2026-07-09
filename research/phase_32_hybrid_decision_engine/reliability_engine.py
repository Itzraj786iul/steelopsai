"""Reliability index — final operator trust score (0–100)."""

from __future__ import annotations

from phase32_config import RELIABILITY_WEIGHTS


def reliability_index(
    *,
    ai_confidence: float,
    physics_confidence: float,
    industrial_confidence: float,
    historical_similarity_pct: float,
    stability: float,
    agreement_pct: float,
) -> dict[str, float]:
    """Part 7 — weighted reliability index."""
    w = RELIABILITY_WEIGHTS
    score = (
        w["ai_confidence"] * ai_confidence
        + w["physics_confidence"] * physics_confidence
        + w["industrial_confidence"] * industrial_confidence
        + w["historical_similarity"] * historical_similarity_pct
        + w["stability"] * stability
        + w["agreement"] * agreement_pct
    )
    return {
        "reliability_index": round(max(0, min(100, score)), 1),
        "contributions": {
            "ai": round(w["ai_confidence"] * ai_confidence, 2),
            "physics": round(w["physics_confidence"] * physics_confidence, 2),
            "industrial": round(w["industrial_confidence"] * industrial_confidence, 2),
            "similarity": round(w["historical_similarity"] * historical_similarity_pct, 2),
            "stability": round(w["stability"] * stability, 2),
            "agreement": round(w["agreement"] * agreement_pct, 2),
        },
    }


def reliability_tier(index: float) -> str:
    if index >= 80:
        return "High Trust"
    if index >= 65:
        return "Moderate Trust"
    if index >= 50:
        return "Low Trust"
    return "Review Required"
