"""Phase 33 — bridge to frozen Phase 31 V2 and Phase 32 hybrid engine (read-only)."""

from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
PHASE31 = ROOT / "research" / "phase_31_optimizer_v2"
PHASE32 = ROOT / "research" / "phase_32_hybrid_decision_engine"


def _ensure_paths() -> None:
    for p in (PHASE31, PHASE32, ROOT / "research" / "phase_21_streamlit_app"):
        s = str(p)
        if s not in sys.path:
            sys.path.insert(0, s)
    p20 = str(ROOT / "research" / "phase_20_recipe_optimizer")
    if p20 not in sys.path:
        sys.path.append(p20)


@lru_cache(maxsize=1)
def _hybrid_engine():
    _ensure_paths()
    from hybrid_decision_engine import HybridDecisionEngine  # noqa: WPS433

    # Interactive UI budget — research scripts can construct with higher n.
    return HybridDecisionEngine(n_generate=200)


@lru_cache(maxsize=1)
def _optimizer_v2():
    _ensure_paths()
    from experimental_optimizer_v2 import ExperimentalOptimizerV2  # noqa: WPS433

    return ExperimentalOptimizerV2(n_generate=200)


def evaluate_hybrid(recipe: dict[str, Any], heat_id: str = "") -> dict[str, Any]:
    engine = _hybrid_engine()
    result = engine.evaluate(recipe, heat_id=heat_id or "")
    # Use hybrid engine output only — a second V2 optimize() duplicated hundreds of model calls.
    top5 = list(getattr(result, "top5", None) or [])
    best = top5[0] if top5 else {}
    if not isinstance(best, dict):
        best = {
            "historical_similarity_pct": getattr(best, "historical_similarity_pct", 0),
            "stability": getattr(best, "stability", 0),
            "explanation": getattr(best, "explanation", {}),
        }
    return {
        "heat_id": heat_id,
        "current_ttt": result.current_ttt,
        "predicted_ttt": result.predicted_ttt,
        "improvement_min": result.improvement_min,
        "hybrid_score": result.hybrid_score,
        "score_breakdown": result.score_breakdown,
        "reliability_index": result.reliability_index,
        "reliability_tier": result.reliability_tier,
        "physics_confidence": result.physics_confidence,
        "ai_confidence": result.ai_confidence,
        "industrial_confidence": result.industrial_confidence,
        "historical_similarity_pct": best.get("historical_similarity_pct", 0) or 0,
        "recommendation_stability": best.get("stability", 0) or 0,
        "agreement_pct": result.agreement_pct,
        "consensus": result.consensus,
        "decision_tree": result.decision_tree,
        "scenarios": result.scenarios,
        "digital_twin": result.digital_twin,
        "recommended_recipe": result.recommended_recipe,
        "top5": result.top5,
        "explanation": best.get("explanation") or {},
    }


def optimize_v2(recipe: dict[str, Any]) -> dict[str, Any]:
    opt = _optimizer_v2()
    result = opt.optimize(recipe)
    recs = []
    for r in result.recommendations:
        recs.append(
            {
                "rank": r.rank,
                "recipe": r.recipe,
                "predicted_ttt": r.predicted_ttt,
                "improvement_min": r.improvement_min,
                "confidence": r.confidence,
                "historical_similarity_pct": r.historical_similarity_pct,
                "stability": r.stability,
                "rules_satisfied": r.rules_satisfied,
                "rules_violated": r.rules_violated,
                "physics_feasible": r.physics_feasible,
                "physics_violations": r.physics_violations,
                "objective_breakdown": r.objective_breakdown,
                "explanation": r.explanation,
                "industrial_score": r.industrial_score,
                "physics_score": r.physics_score,
            }
        )
    best = result.best
    return {
        "current_recipe": result.current_recipe,
        "current_ttt": result.current_ttt,
        "optimized_recipe": best.recipe if best else result.current_recipe,
        "optimized_ttt": best.predicted_ttt if best else result.current_ttt,
        "improvement_min": best.improvement_min if best else 0,
        "physics_compliant": best.physics_feasible if best else False,
        "power_optimized": False,
        "recommendations": recs,
        "diagnostics": result.diagnostics,
    }
