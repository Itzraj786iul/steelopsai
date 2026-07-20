"""ML service — wraps frozen Phase 19 model and Phase 20.2 optimizer."""

from __future__ import annotations

import sys
import time
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

import pandas as pd

from app.core.config import CI_HALF_WIDTH_95, DEFAULT_RECIPE, PHASE21_ROOT, TEST_MAE, get_settings
from app.core.version_registry import get_version_registry
from app.services.industrial_validation import (
    build_advisory_warnings,
    build_operator_summary,
    compute_confidence,
    derive_charge_bounds,
    full_historical_statistics,
    sanitize_recipe,
    total_charge,
)
from app.services.structured_logging import log_optimization, log_prediction
from app.services.response_labels import (
    relabel_comparison_row,
    relabel_contributor,
    relabel_historical_variable,
    relabel_process_health_item,
)
from app.services.explainability_service import (
    build_optimization_explainability,
    build_prediction_explainability,
    serialize_diagnostics,
)


def _ensure_phase21_path() -> None:
    path = str(PHASE21_ROOT)
    if path not in sys.path:
        sys.path.insert(0, path)


# Set True after background warmup (or first successful predict/optimize).
# health() must NEVER load pickles — that blocked login on the event loop for 10–30s.
_ml_warm = False


def ml_is_warm() -> bool:
    return _ml_warm


def mark_ml_warm() -> None:
    global _ml_warm
    _ml_warm = True


@lru_cache(maxsize=1)
def get_prediction_engine():
    _ensure_phase21_path()
    from prediction_engine import PredictionEngine

    engine = PredictionEngine()
    mark_ml_warm()
    return engine


@lru_cache(maxsize=1)
def get_optimizer_engine():
    _ensure_phase21_path()
    from optimizer_engine import OptimizerEngine

    return OptimizerEngine()


@lru_cache(maxsize=1)
def get_historical_stats() -> pd.DataFrame:
    _ensure_phase21_path()
    from utils import load_historical_stats

    return load_historical_stats()


@lru_cache(maxsize=1)
def get_historical_raw() -> pd.DataFrame:
    _ensure_phase21_path()
    from utils import load_historical_raw

    return load_historical_raw()


def _prediction_metadata(confidence: str, warnings: list[str]) -> dict[str, Any]:
    registry = get_version_registry()
    return {
        "model_version": registry["backend_version"],
        "pipeline": registry["model_phase"],
        "optimizer": registry["optimizer_phase"],
        "prediction_timestamp": datetime.now(timezone.utc).isoformat(),
        "confidence": confidence,
        "warnings": warnings,
    }


def _top_contributors_fast(engine: Any, recipe: dict[str, Any]) -> list[dict[str, Any]]:
    """Top-5 ablation attribution — same logic as PredictionEngine, fewer features."""
    _ensure_phase21_path()
    from config import TOP_CONTRIBUTOR_FEATURES
    from feature_engineering import engineer_recipe_features, recipe_to_dataframe

    current_feats = engineer_recipe_features(recipe_to_dataframe(recipe)).iloc[0]
    base_pred = engine._predict_from_features(current_feats.to_frame().T)
    imp_map = engine.global_importance.set_index("Feature")["Mean_ABS_SHAP"].to_dict()

    rows: list[dict[str, Any]] = []
    for feat in TOP_CONTRIBUTOR_FEATURES:
        modified = current_feats.copy()
        modified[feat] = engine.baseline_features[feat]
        mod_pred = engine._predict_from_features(modified.to_frame().T)
        rows.append(
            relabel_contributor(
                {
                    "feature": feat,
                    "display_name": feat,
                    "contribution": float(base_pred - mod_pred),
                    "global_importance": float(imp_map.get(feat, 0.0)),
                }
            )
        )
    rows.sort(key=lambda row: abs(row["contribution"]), reverse=True)
    return rows


def predict_recipe(recipe: dict[str, Any]) -> dict[str, Any]:
    start = time.perf_counter()
    clean_recipe, sanitize_notices = sanitize_recipe(recipe)

    try:
        stats = get_historical_stats()
        stats_loaded = True
    except Exception:
        stats = pd.DataFrame()
        stats_loaded = False

    bounds = derive_charge_bounds(stats) if stats_loaded else derive_charge_bounds(
        pd.DataFrame(
            {
                "p5": [28, 31, 0, 0],
                "median": [56.8, 63.2, 0, 0],
                "p95": [60, 68, 0, 0],
                "mean": [56.8, 63.2, 0, 0],
                "std": [2, 2, 0, 0],
            },
            index=["HM", "DRI", "HBI", "Bucket"],
        )
    )

    advisory_warnings, charge_class, plain_warnings = (
        build_advisory_warnings(clean_recipe, stats, bounds, sanitize_notices)
        if stats_loaded
        else build_advisory_warnings(clean_recipe, stats, bounds, sanitize_notices + ["Historical statistics unavailable — confidence may be conservative."])
    )

    confidence = compute_confidence(total_charge(clean_recipe), bounds, len(advisory_warnings))

    engine = get_prediction_engine()
    predicted = engine.predict(clean_recipe)
    top_contributors = _top_contributors_fast(engine, clean_recipe)

    operator_summary = build_operator_summary(
        clean_recipe,
        predicted,
        confidence,
        charge_class,
        advisory_warnings,
    )

    latency_ms = (time.perf_counter() - start) * 1000
    log_prediction(
        charge=total_charge(clean_recipe),
        shift=str(clean_recipe.get("Shift", "C")),
        confidence=confidence,
        warnings=plain_warnings,
        predicted_ttt=predicted,
        latency_ms=latency_ms,
    )

    result = {
        "predicted_ttt": predicted,
        "margin": TEST_MAE,
        "ci_lower_95": predicted - CI_HALF_WIDTH_95,
        "ci_upper_95": predicted + CI_HALF_WIDTH_95,
        "top_contributors": top_contributors,
        "operator_summary": operator_summary,
        "validation_warnings": advisory_warnings,
        "confidence": confidence,
        "charge_classification": charge_class,
        "metadata": _prediction_metadata(confidence, plain_warnings),
    }
    result["explainability"] = build_prediction_explainability(
        clean_recipe, result, stats if stats_loaded else pd.DataFrame(), stats_loaded
    )
    result["top_contributors"] = result["explainability"]["contributor_interpretations"]

    # Neighbor-informed CI / advisory calibration — Phase 19 pickles stay authority.
    bench = result["explainability"].get("neighbor_benchmark")
    sim_pct = float(result["explainability"].get("historical_similarity_pct") or 0.0)
    half = float(CI_HALF_WIDTH_95)
    if isinstance(bench, dict) and int(bench.get("n") or 0) >= 3:
        n_std = float(bench.get("std_actual_ttt") or 0.0)
        n_mean = float(bench.get("mean_actual_ttt") or predicted)
        if sim_pct >= 70.0 and n_std < 4.0:
            half = max(float(TEST_MAE) * 1.15, half * 0.88)
        elif sim_pct < 50.0 or n_std > 6.0:
            half = half * 1.12
        # Small advisory blend only when neighbours are recipe-similar
        if sim_pct >= 60.0:
            alpha = min(0.12, 0.04 + 0.08 * (sim_pct / 100.0))
            result["neighbor_calibrated_ttt"] = round((1.0 - alpha) * float(predicted) + alpha * n_mean, 2)
        result["neighbor_ttt_band"] = {
            "mean": bench.get("mean_actual_ttt"),
            "median": bench.get("median_actual_ttt"),
            "min": bench.get("min_actual_ttt"),
            "max": bench.get("max_actual_ttt"),
            "std": bench.get("std_actual_ttt"),
            "n": bench.get("n"),
        }
    result["ci_lower_95"] = round(float(predicted) - half, 2)
    result["ci_upper_95"] = round(float(predicted) + half, 2)
    result["ci_half_width"] = round(half, 2)
    return result


def optimize_recipe(recipe: dict[str, Any], n_generate: int = 1000) -> dict[str, Any]:
    start = time.perf_counter()
    clean_recipe, _ = sanitize_recipe(recipe)

    opt_engine = get_optimizer_engine()
    opt = opt_engine.optimize(
        clean_recipe,
        power_restriction=int(clean_recipe.get("Power_Restriction", 0)),
        n_generate=n_generate,
    )

    _ensure_phase21_path()
    from utils import arrow_for_delta

    comparison = []
    for col in ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]:
        cur = float(clean_recipe[col])
        rec = float(opt.optimized_recipe[col])
        delta = rec - cur
        comparison.append(
            relabel_comparison_row(
                {
                    "variable": col,
                    "current": cur,
                    "optimized": rec,
                    "difference": delta,
                    "pct_change": (delta / cur * 100) if abs(cur) > 1e-6 else 0.0,
                    "arrow": arrow_for_delta(delta, col),
                    "reason": opt_engine.explain_change(col, cur, rec, bool(opt.power_restriction)),
                    "physics_status": opt_engine.physics_status(
                        col, clean_recipe, opt.optimized_recipe, bool(opt.power_restriction)
                    ),
                }
            )
        )

    latency_ms = (time.perf_counter() - start) * 1000
    log_optimization(
        charge=total_charge(clean_recipe),
        shift=str(clean_recipe.get("Shift", "C")),
        improvement_min=float(opt.improvement_min),
        latency_ms=latency_ms,
    )

    return {
        "current_recipe": opt.current_recipe,
        "optimized_recipe": opt.optimized_recipe,
        "current_ttt": opt.current_ttt,
        "optimized_ttt": opt.optimized_ttt,
        "improvement_min": opt.improvement_min,
        "physics_compliant": opt.physics_compliant,
        "best_score": opt.best_score,
        "comparison": comparison,
        "diagnostics": serialize_diagnostics(opt.diagnostics),
        "explainability": build_optimization_explainability(
            clean_recipe,
            {
                "current_recipe": opt.current_recipe,
                "optimized_recipe": opt.optimized_recipe,
                "current_ttt": opt.current_ttt,
                "optimized_ttt": opt.optimized_ttt,
                "improvement_min": opt.improvement_min,
                "physics_compliant": opt.physics_compliant,
                "best_score": opt.best_score,
                "comparison": comparison,
                "diagnostics": opt.diagnostics,
            },
            opt,
            get_historical_stats(),
            True,
        ),
    }


def whatif_analysis(recipe: dict[str, Any], variables: list[str] | None = None) -> dict[str, Any]:
    clean_recipe, _ = sanitize_recipe(recipe)
    engine = get_prediction_engine()
    variables = variables or ["HM", "DRI", "POWER", "OXY", "CPC", "Bucket"]
    baseline = engine.predict(clean_recipe)
    tornado = []
    for var in variables:
        if var not in clean_recipe:
            continue
        base_val = float(clean_recipe[var])
        span = max(base_val * 0.05, 1.0 if var not in {"POWER", "OXY"} else 100.0)
        low = dict(clean_recipe)
        high = dict(clean_recipe)
        low[var] = max(0.0, base_val - span)
        high[var] = base_val + span
        from app.services.response_labels import format_display_name

        tornado.append(
            {
                "variable": var,
                "display_name": format_display_name(var),
                "low_delta": engine.predict(low) - baseline,
                "high_delta": engine.predict(high) - baseline,
            }
        )
    return {"predicted_ttt": baseline, "baseline_ttt": baseline, "tornado": tornado}


def process_health(recipe: dict[str, Any]) -> list[dict[str, Any]]:
    clean_recipe, _ = sanitize_recipe(recipe)
    _ensure_phase21_path()
    from utils import process_health_table

    health = process_health_table(clean_recipe, get_historical_stats())
    color_map = {"Excellent": "green", "Good": "green", "Warning": "yellow", "Out of Practice": "red"}
    items = []
    for _, row in health.iterrows():
        items.append(
            relabel_process_health_item(
                {
                    "gauge": row["Gauge"],
                    "value": float(row["Value"]),
                    "p5": float(row["P5"]),
                    "median": float(row["Median"]),
                    "p95": float(row["P95"]),
                    "status": row["Status"],
                    "color": color_map.get(row["Status"], "yellow"),
                }
            )
        )
    return items


def historical_comparison(recipe: dict[str, Any]) -> dict[str, Any]:
    clean_recipe, _ = sanitize_recipe(recipe)
    _ensure_phase21_path()
    from utils import historical_comparison_table

    stats = get_historical_stats()
    table = historical_comparison_table(clean_recipe, stats)
    raw = get_historical_raw()
    dist: dict[str, list[float]] = {}
    for col in ["HM", "DRI", "POWER", "OXY"]:
        dist[col] = raw[col].dropna().tolist()[:500]
    variables = [
        relabel_historical_variable(
            {
                "variable": str(row["Variable"]),
                "current": float(row["Current"]),
                "p5": float(row["P5"]),
                "median": float(row["Median"]),
                "p95": float(row["P95"]),
                "status": str(row["Status"]),
            }
        )
        for _, row in table.iterrows()
    ]
    return {
        "variables": variables,
        "distribution": dist,
    }


def historical_statistics() -> dict[str, Any]:
    stats = get_historical_stats()
    raw = get_historical_raw()
    return {
        "variables": full_historical_statistics(stats, raw),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def generate_report(recipe: dict[str, Any], fmt: str = "json", include_opt: bool = True) -> bytes | str:
    _ensure_phase21_path()
    from utils import build_csv_export, build_json_export, generate_pdf_report, historical_comparison_table, generate_industrial_interpretation

    clean_recipe, _ = sanitize_recipe(recipe)
    pred_data = predict_recipe(clean_recipe)
    engine = get_prediction_engine()
    result = engine.predict_with_interval(clean_recipe)
    opt = None
    if include_opt:
        try:
            opt_data = optimize_recipe(clean_recipe, n_generate=200)
            opt = type("Opt", (), opt_data)()
            opt.optimized_recipe = opt_data["optimized_recipe"]
            opt.current_ttt = opt_data["current_ttt"]
            opt.optimized_ttt = opt_data["optimized_ttt"]
            opt.improvement_min = opt_data["improvement_min"]
            opt.physics_compliant = opt_data["physics_compliant"]
        except Exception:
            opt = None

    stats = get_historical_stats()
    interpretations = generate_industrial_interpretation(clean_recipe, result.predicted_ttt, stats, result.top_contributors)
    comparison = historical_comparison_table(clean_recipe, stats)

    if fmt == "json":
        return build_json_export(clean_recipe, result, opt)
    if fmt == "csv":
        return build_csv_export(clean_recipe, result, opt)
    if fmt == "pdf":
        return generate_pdf_report(
            clean_recipe,
            result,
            opt,
            interpretations,
            comparison,
            result.contributions,
            operator_summary=pred_data["operator_summary"],
        )
    raise ValueError(f"Unsupported format: {fmt}")


class MLService:
    """Facade for timed operations and health checks."""

    def health(self) -> dict[str, Any]:
        """Fast readiness probe — never loads ML artifacts (see mark_ml_warm)."""
        from app.core.config import MODEL_PATH, OPTIMIZER_PKL_PATH

        settings = get_settings()
        registry = get_version_registry()
        model_ok = get_prediction_engine.cache_info().currsize > 0 or ml_is_warm()
        opt_ok = get_optimizer_engine.cache_info().currsize > 0
        stats_ok = get_historical_stats.cache_info().currsize > 0
        artifacts_present = MODEL_PATH.exists() and OPTIMIZER_PKL_PATH.exists()

        return {
            "status": "ok" if model_ok else ("warming" if artifacts_present else "degraded"),
            "model_loaded": model_ok,
            "optimizer_loaded": opt_ok,
            "historical_statistics_loaded": stats_ok,
            "version": settings.app_version,
            "frontend_version": registry["frontend_version"],
            "backend_version": registry["backend_version"],
            "production_model": registry["model_phase"],
            "optimizer_version": registry["optimizer_phase"],
            "research_version": registry["research_phase"],
            "dataset_version": registry["dataset_version"],
            "git_commit": registry["git_commit"],
            "build_date": registry["build_date"],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def model_info(self) -> dict[str, Any]:
        _ensure_phase21_path()
        from feature_engineering import MODEL_FEATURES
        from app.core.config import (
            CI_HALF_WIDTH_95,
            DATASET_LABEL,
            MODEL_NAME,
            MODEL_PATH,
            N_FEATURES,
            OPTIMIZER_PKL_PATH,
            OPTIMIZER_VERSION,
            PREPROC_PATH,
            TEST_MAE,
            TEST_R2,
        )
        from app.services.response_labels import format_display_name

        return {
            "model_name": MODEL_NAME,
            "optimizer_version": OPTIMIZER_VERSION,
            "n_features": N_FEATURES,
            "test_mae": TEST_MAE,
            "test_r2": TEST_R2,
            "ci_half_width_95": CI_HALF_WIDTH_95,
            "dataset": DATASET_LABEL,
            "features": MODEL_FEATURES,
            "feature_labels": [format_display_name(f) for f in MODEL_FEATURES],
            "artifacts": {
                "production_model": str(MODEL_PATH),
                "preprocessing": str(PREPROC_PATH),
                "optimizer_pkl": str(OPTIMIZER_PKL_PATH),
            },
        }

    def version_registry(self) -> dict[str, Any]:
        return get_version_registry()


ml_service = MLService()
