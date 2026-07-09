"""Advisory industrial validation — never reject predictions for charge or operating range."""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

import pandas as pd

from app.services.response_labels import ELECTRICAL_ENERGY_LABEL, format_display_name, relabel_warning_message

BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]
CONTROLLABLE_NUMERIC = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]
VALID_SHIFTS = {"A", "B", "C"}


@dataclass(frozen=True)
class ChargeBounds:
    p5: float
    median: float
    p95: float
    mean: float
    std: float
    min: float
    max: float


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, str) and not value.strip():
        return default
    try:
        num = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(num) or math.isinf(num):
        return default
    return num


def total_charge(recipe: dict[str, Any]) -> float:
    return sum(_safe_float(recipe.get(col)) for col in BURDEN_COLS)


def derive_charge_bounds(stats: pd.DataFrame) -> ChargeBounds:
    p5 = sum(float(stats.loc[col, "p5"]) for col in BURDEN_COLS if col in stats.index)
    median = sum(float(stats.loc[col, "median"]) for col in BURDEN_COLS if col in stats.index)
    p95 = sum(float(stats.loc[col, "p95"]) for col in BURDEN_COLS if col in stats.index)
    mean = sum(float(stats.loc[col, "mean"]) for col in BURDEN_COLS if col in stats.index)
    variance = sum(float(stats.loc[col, "std"]) ** 2 for col in BURDEN_COLS if col in stats.index)
    std = math.sqrt(variance) if variance > 0 else max(p95 - p5, 1.0)
    return ChargeBounds(
        p5=p5,
        median=median,
        p95=p95,
        mean=mean,
        std=std,
        min=max(0.0, p5 - std * 2),
        max=p95 + std * 2,
    )


def classify_charge(charge: float, bounds: ChargeBounds) -> str:
    span = max(bounds.p95 - bounds.p5, 1.0)
    if bounds.p5 <= charge <= bounds.p95:
        return "Normal"
    if charge < bounds.p5:
        if charge >= bounds.p5 - span * 0.5:
            return "Low"
        return "Extreme"
    if charge <= bounds.p95 + span * 0.35:
        return "High"
    if charge <= bounds.p95 + span * 0.75:
        return "Very High"
    return "Extreme"


def compute_confidence(charge: float, bounds: ChargeBounds, advisory_warning_count: int) -> str:
    classification = classify_charge(charge, bounds)
    span = max(bounds.p95 - bounds.p5, 1.0)

    if classification == "Normal":
        dist = abs(charge - bounds.median) / span
        if dist <= 0.25 and advisory_warning_count == 0:
            return "High"
        if dist <= 0.45 and advisory_warning_count <= 1:
            return "Medium"
        if advisory_warning_count <= 2:
            return "Low"
        return "Very Low"

    if classification in {"Low", "High"}:
        return "Medium" if advisory_warning_count <= 2 else "Low"
    if classification == "Very High":
        return "Low"
    return "Very Low"


def sanitize_recipe(raw: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    """Normalize inputs for prediction — clamp invalid numerics instead of rejecting."""
    recipe: dict[str, Any] = {}
    notices: list[str] = []

    for col in CONTROLLABLE_NUMERIC:
        original = raw.get(col)
        value = _safe_float(original, 0.0)
        if original is None or (isinstance(original, str) and not str(original).strip()):
            notices.append(f"Missing {format_display_name(col)} — defaulted to 0.")
        elif isinstance(original, str):
            try:
                float(original)
            except ValueError:
                notices.append(f"Invalid numeric value for {format_display_name(col)} — defaulted to 0.")
        if value < 0:
            notices.append(f"{format_display_name(col)} was negative — clamped to 0.")
            value = 0.0
        recipe[col] = value

    shift = str(raw.get("Shift", "C")).strip().upper()
    if shift not in VALID_SHIFTS:
        notices.append(f"Invalid shift '{raw.get('Shift')}' — defaulted to C.")
        shift = "C"
    recipe["Shift"] = shift

    restriction = raw.get("Power_Restriction", 0)
    try:
        restriction_int = int(restriction)
    except (TypeError, ValueError):
        restriction_int = 0
        notices.append("Invalid Electrical Restriction flag — defaulted to inactive.")
    recipe["Power_Restriction"] = 1 if restriction_int else 0

    return recipe, notices


def build_advisory_warnings(
    recipe: dict[str, Any],
    stats: pd.DataFrame,
    bounds: ChargeBounds,
    sanitize_notices: list[str] | None = None,
) -> tuple[list[dict[str, str]], str, list[str]]:
    """Return validation warnings, charge classification, and plain-text warning messages."""
    warnings: list[dict[str, str]] = []
    plain: list[str] = []

    for notice in sanitize_notices or []:
        msg = relabel_warning_message(notice)
        warnings.append({"level": "warning", "message": msg})
        plain.append(msg)

    charge = total_charge(recipe)
    charge_class = classify_charge(charge, bounds)

    if charge_class == "Normal":
        pass
    elif charge_class == "Low":
        msg = (
            f"Total charge {charge:.1f} t is below the historical 5th percentile "
            f"({bounds.p5:.1f} t). Prediction uncertainty may be higher."
        )
        warnings.append({"level": "warning", "message": msg})
        plain.append(msg)
    elif charge_class == "High":
        msg = (
            f"Total charge {charge:.1f} t is above the historical 95th percentile "
            f"({bounds.p95:.1f} t). Prediction uncertainty may be higher."
        )
        warnings.append({"level": "warning", "message": msg})
        plain.append(msg)
    elif charge_class == "Very High":
        msg = (
            f"Total charge {charge:.1f} t is well above historical experience "
            f"(median {bounds.median:.1f} t). Review burden distribution before committing."
        )
        warnings.append({"level": "warning", "message": msg})
        plain.append(msg)
    else:
        msg = (
            f"Total charge {charge:.1f} t is outside historical operating range "
            f"(P5–P95: {bounds.p5:.1f}–{bounds.p95:.1f} t). Prediction uncertainty may be higher."
        )
        warnings.append({"level": "warning", "message": msg})
        plain.append(msg)

    for col in CONTROLLABLE_NUMERIC:
        val = _safe_float(recipe.get(col))
        if col not in stats.index:
            continue
        row = stats.loc[col]
        label = format_display_name(col)
        if val < float(row["p5"]) * 0.85:
            msg = f"{label} ({val:.1f}) is below historical operating range."
            warnings.append({"level": "warning", "message": msg})
            plain.append(msg)
        elif val > float(row["p95"]) * 1.05:
            msg = f"{label} ({val:.1f}) is above historical P95 ({float(row['p95']):.1f})."
            warnings.append({"level": "warning", "message": msg})
            plain.append(msg)

    power = _safe_float(recipe.get("POWER"))
    if "POWER" in stats.index and power < float(stats.loc["POWER", "p5"]) * 0.9:
        msg = f"{ELECTRICAL_ENERGY_LABEL} is unusually low for plant practice."
        warnings.append({"level": "warning", "message": msg})
        plain.append(msg)

    return warnings, charge_class, plain


def build_operator_summary(
    recipe: dict[str, Any],
    predicted_ttt: float,
    confidence: str,
    charge_class: str,
    advisory_warnings: list[dict[str, str]],
) -> dict[str, Any]:
    warning_count = len(advisory_warnings)
    if charge_class in {"Extreme", "Very High"} or warning_count >= 4:
        process_status = "REVIEW"
        risk = "HIGH"
    elif charge_class in {"Low", "High"} or warning_count >= 2:
        process_status = "CAUTION"
        risk = "MEDIUM"
    else:
        process_status = "GOOD"
        risk = "LOW"

    if predicted_ttt <= 42:
        expected_quality = "Stable Heat"
    elif predicted_ttt <= 48:
        expected_quality = "Extended Cycle"
    else:
        expected_quality = "Review Required"

    return {
        "process_status": process_status,
        "confidence": confidence,
        "risk": risk,
        "expected_quality": expected_quality,
        "total_charge_t": round(total_charge(recipe), 2),
        "charge_classification": charge_class,
    }


def full_historical_statistics(stats: pd.DataFrame, raw: pd.DataFrame) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for col in CONTROLLABLE_NUMERIC:
        series = pd.to_numeric(raw[col], errors="coerce").dropna()
        rows.append(_series_stats(col, series))

    charge_series = raw[BURDEN_COLS].apply(pd.to_numeric, errors="coerce").sum(axis=1).dropna()
    rows.append(_series_stats("Total_Charge", charge_series))

    flux = pd.to_numeric(raw["LIME"], errors="coerce").fillna(0) + pd.to_numeric(raw["DOLO"], errors="coerce").fillna(0)
    rows.append(_series_stats("FLUX", flux.dropna()))

    return rows


def _series_stats(variable: str, series: pd.Series) -> dict[str, Any]:
    s = series.dropna()
    if s.empty:
        return {
            "variable": variable,
            "display_name": format_display_name(variable),
            "min": 0.0,
            "p5": 0.0,
            "median": 0.0,
            "p95": 0.0,
            "max": 0.0,
            "mean": 0.0,
            "std": 0.0,
        }
    return {
        "variable": variable,
        "display_name": format_display_name(variable),
        "min": float(s.min()),
        "p5": float(s.quantile(0.05)),
        "median": float(s.median()),
        "p95": float(s.quantile(0.95)),
        "max": float(s.max()),
        "mean": float(s.mean()),
        "std": float(s.std()),
    }
