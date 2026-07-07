"""ML service — wraps frozen Phase 19 model and Phase 20.2 optimizer."""

from __future__ import annotations

import sys
import time
from functools import lru_cache
from typing import Any

import pandas as pd

from app.core.config import CI_HALF_WIDTH_95, DEFAULT_RECIPE, PHASE21_ROOT, TEST_MAE, get_settings


def _ensure_phase21_path() -> None:
    path = str(PHASE21_ROOT)
    if path not in sys.path:
        sys.path.insert(0, path)


@lru_cache(maxsize=1)
def get_prediction_engine():
    _ensure_phase21_path()
    from prediction_engine import PredictionEngine
    return PredictionEngine()


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


def _top_contributors_fast(engine: Any, recipe: dict[str, Any]) -> list[dict[str, Any]]:
    """Top-5 ablation attribution — same logic as PredictionEngine, fewer features."""
    _ensure_phase21_path()
    from config import FEATURE_DISPLAY_NAMES, TOP_CONTRIBUTOR_FEATURES
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
            {
                "feature": feat,
                "display_name": FEATURE_DISPLAY_NAMES.get(feat, feat.replace("_", " ")),
                "contribution": float(base_pred - mod_pred),
                "global_importance": float(imp_map.get(feat, 0.0)),
            }
        )
    rows.sort(key=lambda row: abs(row["contribution"]), reverse=True)
    return rows


def predict_recipe(recipe: dict[str, Any]) -> dict[str, Any]:
    _ensure_phase21_path()
    from types import SimpleNamespace

    from utils import (
        build_operator_summary,
        live_validation_warnings,
        validate_recipe,
    )

    ok, errors = validate_recipe(recipe)
    if not ok:
        raise ValueError("; ".join(errors))

    engine = get_prediction_engine()
    stats = get_historical_stats()
    predicted = engine.predict(recipe)
    top_contributors = _top_contributors_fast(engine, recipe)
    result = SimpleNamespace(
        predicted_ttt=predicted,
        margin=TEST_MAE,
        ci_lower_95=predicted - CI_HALF_WIDTH_95,
        ci_upper_95=predicted + CI_HALF_WIDTH_95,
    )
    warnings = live_validation_warnings(recipe, stats)
    summary = build_operator_summary(recipe, result, stats)

    return {
        "predicted_ttt": result.predicted_ttt,
        "margin": result.margin,
        "ci_lower_95": result.ci_lower_95,
        "ci_upper_95": result.ci_upper_95,
        "top_contributors": top_contributors,
        "operator_summary": summary,
        "validation_warnings": [{"level": l, "message": m} for l, m in warnings],
    }


def optimize_recipe(recipe: dict[str, Any], n_generate: int = 1000) -> dict[str, Any]:
    _ensure_phase21_path()
    from utils import arrow_for_delta, validate_recipe

    ok, errors = validate_recipe(recipe)
    if not ok:
        raise ValueError("; ".join(errors))

    opt_engine = get_optimizer_engine()
    opt = opt_engine.optimize(recipe, power_restriction=int(recipe.get("Power_Restriction", 0)), n_generate=n_generate)

    comparison = []
    for col in ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]:
        cur = float(recipe[col])
        rec = float(opt.optimized_recipe[col])
        delta = rec - cur
        comparison.append({
            "variable": col,
            "current": cur,
            "optimized": rec,
            "difference": delta,
            "pct_change": (delta / cur * 100) if abs(cur) > 1e-6 else 0.0,
            "arrow": arrow_for_delta(delta, col),
            "reason": opt_engine.explain_change(col, cur, rec, bool(opt.power_restriction)),
            "physics_status": opt_engine.physics_status(col, recipe, opt.optimized_recipe, bool(opt.power_restriction)),
        })

    return {
        "current_recipe": opt.current_recipe,
        "optimized_recipe": opt.optimized_recipe,
        "current_ttt": opt.current_ttt,
        "optimized_ttt": opt.optimized_ttt,
        "improvement_min": opt.improvement_min,
        "physics_compliant": opt.physics_compliant,
        "best_score": opt.best_score,
        "comparison": comparison,
        "diagnostics": opt.diagnostics,
    }


def whatif_analysis(recipe: dict[str, Any], variables: list[str] | None = None) -> dict[str, Any]:
    _ensure_phase21_path()
    engine = get_prediction_engine()
    variables = variables or ["HM", "DRI", "POWER", "OXY", "CPC", "Bucket"]
    baseline = engine.predict(recipe)
    tornado = []
    for var in variables:
        base_val = float(recipe[var])
        span = max(base_val * 0.05, 1.0 if var not in {"POWER", "OXY"} else 100.0)
        low = dict(recipe)
        high = dict(recipe)
        low[var] = max(0.0, base_val - span)
        high[var] = base_val + span
        tornado.append({
            "variable": var,
            "low_delta": engine.predict(low) - baseline,
            "high_delta": engine.predict(high) - baseline,
        })
    return {"predicted_ttt": baseline, "baseline_ttt": baseline, "tornado": tornado}


def process_health(recipe: dict[str, Any]) -> list[dict[str, Any]]:
    _ensure_phase21_path()
    from utils import process_health_table

    health = process_health_table(recipe, get_historical_stats())
    color_map = {"Excellent": "green", "Good": "green", "Warning": "yellow", "Out of Practice": "red"}
    items = []
    for _, row in health.iterrows():
        items.append({
            "gauge": row["Gauge"],
            "value": float(row["Value"]),
            "p5": float(row["P5"]),
            "median": float(row["Median"]),
            "p95": float(row["P95"]),
            "status": row["Status"],
            "color": color_map.get(row["Status"], "yellow"),
        })
    return items


def historical_comparison(recipe: dict[str, Any]) -> dict[str, Any]:
    _ensure_phase21_path()
    from utils import historical_comparison_table

    stats = get_historical_stats()
    table = historical_comparison_table(recipe, stats)
    raw = get_historical_raw()
    dist: dict[str, list[float]] = {}
    for col in ["HM", "DRI", "POWER", "OXY"]:
        dist[col] = raw[col].dropna().tolist()[:500]
    variables = [
        {
            "variable": str(row["Variable"]),
            "current": float(row["Current"]),
            "p5": float(row["P5"]),
            "median": float(row["Median"]),
            "p95": float(row["P95"]),
            "status": str(row["Status"]),
        }
        for _, row in table.iterrows()
    ]
    return {
        "variables": variables,
        "distribution": dist,
    }


def generate_report(recipe: dict[str, Any], fmt: str = "json", include_opt: bool = True) -> bytes | str:
    _ensure_phase21_path()
    from utils import build_csv_export, build_json_export, generate_pdf_report, historical_comparison_table, generate_industrial_interpretation

    pred_data = predict_recipe(recipe)
    engine = get_prediction_engine()
    result = engine.predict_with_interval(recipe)
    opt = None
    if include_opt:
        try:
            opt_data = optimize_recipe(recipe, n_generate=200)
            opt = type("Opt", (), opt_data)()
            opt.optimized_recipe = opt_data["optimized_recipe"]
            opt.current_ttt = opt_data["current_ttt"]
            opt.optimized_ttt = opt_data["optimized_ttt"]
            opt.improvement_min = opt_data["improvement_min"]
            opt.physics_compliant = opt_data["physics_compliant"]
        except Exception:
            opt = None

    stats = get_historical_stats()
    interpretations = generate_industrial_interpretation(recipe, result.predicted_ttt, stats, result.top_contributors)
    comparison = historical_comparison_table(recipe, stats)

    if fmt == "json":
        return build_json_export(recipe, result, opt)
    if fmt == "csv":
        return build_csv_export(recipe, result, opt)
    if fmt == "pdf":
        return generate_pdf_report(
            recipe, result, opt, interpretations, comparison, result.contributions,
            operator_summary=pred_data["operator_summary"],
        )
    raise ValueError(f"Unsupported format: {fmt}")


class MLService:
    """Facade for timed operations and health checks."""

    def health(self) -> dict[str, Any]:
        settings = get_settings()
        model_ok = False
        opt_ok = False
        try:
            get_prediction_engine()
            model_ok = True
        except Exception:
            pass
        try:
            get_optimizer_engine()
            opt_ok = True
        except Exception:
            pass
        return {
            "status": "ok" if model_ok else "degraded",
            "model_loaded": model_ok,
            "optimizer_loaded": opt_ok,
            "version": settings.app_version,
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
        return {
            "model_name": MODEL_NAME,
            "optimizer_version": OPTIMIZER_VERSION,
            "n_features": N_FEATURES,
            "test_mae": TEST_MAE,
            "test_r2": TEST_R2,
            "ci_half_width_95": CI_HALF_WIDTH_95,
            "dataset": DATASET_LABEL,
            "features": MODEL_FEATURES,
            "artifacts": {
                "production_model": str(MODEL_PATH),
                "preprocessing": str(PREPROC_PATH),
                "optimizer_pkl": str(OPTIMIZER_PKL_PATH),
            },
        }


ml_service = MLService()
