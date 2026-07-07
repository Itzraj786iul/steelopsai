"""Shared utilities: validation, interpretations, exports, and reporting."""

from __future__ import annotations

import json
from datetime import datetime
from io import BytesIO
from typing import Any

import pandas as pd

from charts import build_distribution_chart, build_tornado_chart, build_waterfall_chart
from config import (
    APP_VERSION,
    BURDEN_COLS,
    CHARGE_MAX_T,
    CHARGE_MIN_T,
    COMPANY_NAME,
    CONTROLLABLE_NUMERIC,
    MODEL_NAME,
    OPTIMIZER_VERSION,
    PHASE13_DATASET,
    PHASE16_DATASET,
    TEST_MAE_MIN,
    VALID_SHIFTS,
)
from feature_engineering import normalize_shift

__all__ = [
    "build_distribution_chart",
    "build_tornado_chart",
    "build_waterfall_chart",
    "build_operator_summary",
    "live_validation_warnings",
    "load_historical_raw",
    "load_historical_stats",
    "default_recipe",
    "total_charge",
    "validate_recipe",
    "historical_comparison_table",
    "process_health_table",
    "generate_industrial_interpretation",
    "build_json_export",
    "build_csv_export",
    "generate_pdf_report",
    "append_session_history",
    "session_history_dataframe",
]


def load_historical_raw() -> pd.DataFrame:
    path = PHASE13_DATASET if PHASE13_DATASET.exists() else PHASE16_DATASET
    df = pd.read_csv(path)
    for col in CONTROLLABLE_NUMERIC:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def load_historical_stats() -> pd.DataFrame:
    df = load_historical_raw()
    rows = []
    for col in CONTROLLABLE_NUMERIC:
        s = pd.to_numeric(df[col], errors="coerce").dropna()
        rows.append(
            {
                "variable": col,
                "p5": float(s.quantile(0.05)),
                "median": float(s.median()),
                "p95": float(s.quantile(0.95)),
                "mean": float(s.mean()),
                "std": float(s.std()),
            }
        )
    flux = df["LIME"].fillna(0) + df["DOLO"].fillna(0)
    rows.append(
        {
            "variable": "FLUX",
            "p5": float(flux.quantile(0.05)),
            "median": float(flux.median()),
            "p95": float(flux.quantile(0.95)),
            "mean": float(flux.mean()),
            "std": float(flux.std()),
        }
    )
    return pd.DataFrame(rows).set_index("variable")


def default_recipe() -> dict[str, Any]:
    path = PHASE16_DATASET
    df = pd.read_csv(path)
    for col in CONTROLLABLE_NUMERIC:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["Total_Charge"] = df[BURDEN_COLS].sum(axis=1)
    in_band = df[(df["Total_Charge"] >= CHARGE_MIN_T) & (df["Total_Charge"] <= CHARGE_MAX_T)]
    pool = in_band if not in_band.empty else df
    row = pool.iloc[(pool["Total_Charge"] - 120.0).abs().argmin()]
    recipe = {col: float(row[col]) for col in CONTROLLABLE_NUMERIC}
    recipe["Shift"] = normalize_shift(row["Shift"])
    recipe["Power_Restriction"] = 0
    return recipe


def total_charge(recipe: dict[str, Any]) -> float:
    return float(sum(float(recipe[c]) for c in BURDEN_COLS))


def validate_recipe(recipe: dict[str, Any]) -> tuple[bool, list[str]]:
    errors: list[str] = []

    for col in CONTROLLABLE_NUMERIC:
        val = recipe.get(col)
        if val is None or (isinstance(val, str) and not str(val).strip()):
            errors.append(f"Missing required input: {col}")
            continue
        try:
            num = float(val)
        except (TypeError, ValueError):
            errors.append(f"Invalid numeric value for {col}")
            continue
        if num < 0:
            errors.append(f"{col} cannot be negative")

    shift = normalize_shift(str(recipe.get("Shift", "")))
    if shift not in VALID_SHIFTS:
        errors.append(f"Invalid shift '{recipe.get('Shift')}'. Use A, B, or C.")

    if not errors:
        charge = total_charge(recipe)
        if charge < CHARGE_MIN_T or charge > CHARGE_MAX_T:
            errors.append(
                f"Total charge {charge:.1f} t is outside allowable range "
                f"({CHARGE_MIN_T:.0f}-{CHARGE_MAX_T:.0f} t)."
            )

    return len(errors) == 0, errors


def live_validation_warnings(recipe: dict[str, Any], stats: pd.DataFrame) -> list[tuple[str, str]]:
    """Return (level, message) tuples for real-time input validation."""
    warnings: list[tuple[str, str]] = []

    for col in CONTROLLABLE_NUMERIC:
        try:
            val = float(recipe.get(col, 0))
        except (TypeError, ValueError):
            continue
        if val < 0:
            warnings.append(("error", f"{col} cannot be negative."))
            continue
        row = stats.loc[col]
        if val < row["p5"] * 0.85:
            warnings.append(("warning", f"{col} ({val:.1f}) is below historical operating range."))
        elif val > row["p95"] * 1.05:
            warnings.append(("warning", f"{col} ({val:.1f}) is above historical P95 ({row['p95']:.1f})."))

    charge = total_charge(recipe)
    if charge > CHARGE_MAX_T:
        warnings.append(("error", f"Total charge {charge:.1f} t exceeds maximum {CHARGE_MAX_T:.0f} t."))
    elif charge < CHARGE_MIN_T:
        warnings.append(("warning", f"Total charge {charge:.1f} t is below typical minimum {CHARGE_MIN_T:.0f} t."))

    power = float(recipe.get("POWER", 0))
    if power < stats.loc["POWER", "p5"] * 0.9:
        warnings.append(("warning", "POWER is unusually low for plant practice."))

    return warnings


def build_operator_summary(
    recipe: dict[str, Any],
    prediction: Any,
    stats: pd.DataFrame,
    optimization: Any | None = None,
) -> dict[str, Any]:
    pred = prediction.predicted_ttt
    charge = total_charge(recipe)
    warnings = live_validation_warnings(recipe, stats)

    if any(l == "error" for l, _ in warnings):
        process_status = "REVIEW"
        risk = "HIGH"
    elif len(warnings) >= 3:
        process_status = "CAUTION"
        risk = "MEDIUM"
    else:
        process_status = "GOOD"
        risk = "LOW"

    confidence = "High" if prediction.margin <= TEST_MAE_MIN + 0.5 else "Moderate"
    if pred <= 42:
        expected_quality = "Stable Heat"
    elif pred <= 48:
        expected_quality = "Extended Cycle"
    else:
        expected_quality = "Review Required"

    recommendations: list[str] = []
    if optimization is not None:
        for col in ["POWER", "OXY", "LIME", "DOLO", "CPC"]:
            cur, opt = float(recipe[col]), float(optimization.optimized_recipe[col])
            if abs(opt - cur) < (5 if col in {"POWER", "OXY"} else 0.1):
                continue
            direction = "Increase" if opt > cur else "Reduce"
            if col == "POWER":
                recommendations.append(f"{direction} Power")
            elif col == "OXY":
                recommendations.append(f"{direction} Oxygen")
            elif col in {"LIME", "DOLO"}:
                if "Maintain Flux" not in recommendations and abs(opt - cur) < 1.0:
                    recommendations.append("Maintain Flux")
            elif col == "CPC":
                recommendations.append(f"{direction} Carbon (CPC)")
    else:
        power_med = stats.loc["POWER", "median"]
        if float(recipe["POWER"]) < power_med * 0.98:
            recommendations.append("Increase Power")
        oxy = float(recipe["OXY"])
        if oxy > stats.loc["OXY", "median"] * 1.02:
            recommendations.append("Reduce Oxygen")
        recommendations.append("Maintain Flux")

    if not recommendations:
        recommendations = ["Maintain current practice"]

    return {
        "process_status": process_status,
        "prediction_min": pred,
        "confidence": confidence,
        "expected_quality": expected_quality,
        "recommendations": recommendations[:4],
        "risk": risk,
        "charge_t": charge,
    }


def append_session_history(entry: dict[str, Any], history: list[dict[str, Any]], max_items: int = 10) -> list[dict[str, Any]]:
    history = [entry] + history
    return history[:max_items]


def session_history_dataframe(history: list[dict[str, Any]]) -> pd.DataFrame:
    if not history:
        return pd.DataFrame(columns=["timestamp", "predicted_ttt", "hm", "dri", "power", "shift", "charge_t"])
    return pd.DataFrame(history)


def zone_status(value: float, p5: float, p95: float) -> str:
    if value < p5:
        return "Below normal"
    if value > p95:
        return "Above normal"
    return "Normal"


def health_label(value: float, p5: float, p95: float) -> str:
    if p5 <= value <= p95:
        mid = (p95 - p5) * 0.25
        if abs(value - (p5 + p95) / 2) <= mid:
            return "Excellent"
        return "Good"
    if value < p5 * 0.85 or value > p95 * 1.15:
        return "Out of Practice"
    return "Warning"


def historical_comparison_table(recipe: dict[str, Any], stats: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for col in CONTROLLABLE_NUMERIC:
        val = float(recipe[col])
        s = stats.loc[col]
        status = zone_status(val, s["p5"], s["p95"])
        rows.append(
            {
                "Variable": col,
                "Current": val,
                "P5": s["p5"],
                "Median": s["median"],
                "P95": s["p95"],
                "Status": status,
            }
        )
    return pd.DataFrame(rows)


def process_health_table(recipe: dict[str, Any], stats: pd.DataFrame) -> pd.DataFrame:
    gauges = {
        "Power": "POWER",
        "Oxygen": "OXY",
        "HM": "HM",
        "DRI": "DRI",
        "Bucket": "Bucket",
        "Flux": "FLUX",
    }
    rows = []
    for label, col in gauges.items():
        if col == "FLUX":
            val = float(recipe["LIME"]) + float(recipe["DOLO"])
        else:
            val = float(recipe[col])
        s = stats.loc[col]
        rows.append(
            {
                "Gauge": label,
                "Value": val,
                "P5": s["p5"],
                "Median": s["median"],
                "P95": s["p95"],
                "Status": health_label(val, s["p5"], s["p95"]),
            }
        )
    return pd.DataFrame(rows)


def generate_industrial_interpretation(
    recipe: dict[str, Any],
    prediction: float,
    stats: pd.DataFrame,
    top_contributors: pd.DataFrame,
) -> list[str]:
    lines: list[str] = []
    tc = total_charge(recipe)
    power_pt = float(recipe["POWER"]) / max(tc, 1e-6)
    oxy = float(recipe["OXY"])
    oxy_med = stats.loc["OXY", "median"]

    for _, row in top_contributors.head(3).iterrows():
        feat = row["feature"]
        if feat == "POWER_PER_TONNE" and row["contribution"] < 0:
            lines.append("Higher Power/Tonne reduces melting time.")
        elif feat == "HM_X_POWER" and row["contribution"] < 0:
            lines.append("HM-Power interaction supports efficient melting.")
        elif feat == "OXYGEN_PER_TONNE" and row["contribution"] < 0:
            lines.append("Oxygen intensity supports faster refining.")

    if oxy > oxy_med * 1.02:
        lines.append("Current oxygen is slightly above plant median.")
    elif oxy < oxy_med * 0.98:
        lines.append("Current oxygen is slightly below plant median.")
    else:
        lines.append("Oxygen level is near plant median.")

    hm, dri = float(recipe["HM"]), float(recipe["DRI"])
    if abs(hm - dri) / max(tc, 1e-6) < 0.08:
        lines.append("Burden composition is balanced.")
    else:
        lines.append("Burden composition reflects established HM-DRI practice.")

    flux = float(recipe["LIME"]) + float(recipe["DOLO"])
    flux_med = stats.loc["FLUX", "median"]
    if abs(flux - flux_med) / max(flux_med, 1e-6) < 0.15:
        lines.append("Flux additions are normal.")
    else:
        lines.append("Flux additions differ from typical plant practice.")

    if prediction <= 42:
        lines.append("Expected operation: Normal heat.")
    elif prediction <= 48:
        lines.append("Expected operation: Extended heat cycle possible.")
    else:
        lines.append("Expected operation: Review process inputs.")

    return lines[:6]


def arrow_for_delta(delta: float, var: str) -> str:
    threshold = 5 if var in {"POWER", "OXY"} else 0.05
    if abs(delta) < threshold:
        return "="
    return "UP" if delta > 0 else "DOWN"


def color_for_change(delta: float, var: str) -> str:
    threshold = 5 if var in {"POWER", "OXY"} else 0.05
    if abs(delta) < threshold:
        return "#C9A227"
    return "#1B7A3D" if delta > 0 else "#B83232"


def recipe_to_export_row(recipe: dict[str, Any], label: str = "recipe") -> dict[str, Any]:
    row = {col: recipe.get(col) for col in CONTROLLABLE_NUMERIC + ["Shift"]}
    row["label"] = label
    row["total_charge_t"] = total_charge(recipe)
    return row


def build_json_export(
    recipe: dict[str, Any],
    prediction: Any,
    optimization: Any | None,
) -> str:
    payload = {
        "timestamp": datetime.now().isoformat(),
        "version": APP_VERSION,
        "current_recipe": recipe,
        "prediction": {
            "ttt_min": prediction.predicted_ttt,
            "margin_min": prediction.margin,
            "ci_95_lower": prediction.ci_lower_95,
            "ci_95_upper": prediction.ci_upper_95,
        },
    }
    if optimization is not None:
        payload["optimization"] = {
            "optimized_recipe": optimization.optimized_recipe,
            "current_ttt": optimization.current_ttt,
            "optimized_ttt": optimization.optimized_ttt,
            "improvement_min": optimization.improvement_min,
            "physics_compliant": optimization.physics_compliant,
        }
    return json.dumps(payload, indent=2)


def build_csv_export(
    recipe: dict[str, Any],
    prediction: Any,
    optimization: Any | None,
) -> str:
    rows = [recipe_to_export_row(recipe, "current")]
    rows[0]["predicted_ttt"] = prediction.predicted_ttt
    if optimization is not None:
        opt_row = recipe_to_export_row(optimization.optimized_recipe, "optimized")
        opt_row["predicted_ttt"] = optimization.optimized_ttt
        rows.append(opt_row)
    return pd.DataFrame(rows).to_csv(index=False)


def generate_pdf_report(
    recipe: dict[str, Any],
    prediction: Any,
    optimization: Any | None,
    interpretations: list[str],
    comparison: pd.DataFrame,
    contributions: pd.DataFrame,
    operator_summary: dict[str, Any] | None = None,
    chart_path: str | None = None,
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], textColor=colors.HexColor("#0B3D6B"), fontSize=16)
    footer_style = ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=colors.grey)
    body = styles["Normal"]
    story = []

    story.append(Paragraph(f"{COMPANY_NAME} — EAF Tap-to-Tap Time Prediction Report", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", body))
    story.append(Paragraph(
        f"Model: {MODEL_NAME} | Optimizer: {OPTIMIZER_VERSION} | App v{APP_VERSION}",
        body,
    ))
    story.append(Spacer(1, 14))

    if operator_summary:
        story.append(Paragraph("Operator Summary", styles["Heading2"]))
        sum_rows = [
            ["Process Status", operator_summary["process_status"]],
            ["Prediction", f"{operator_summary['prediction_min']:.2f} min"],
            ["Confidence", operator_summary["confidence"]],
            ["Risk", operator_summary["risk"]],
        ]
        stbl = Table(sum_rows, colWidths=[6 * cm, 8 * cm])
        stbl.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey)]))
        story.append(stbl)
        story.append(Spacer(1, 12))

    story.append(Paragraph("Current Recipe", styles["Heading2"]))
    rec_rows = [["Variable", "Value"]] + [[c, f"{float(recipe[c]):.2f}"] for c in CONTROLLABLE_NUMERIC]
    rec_rows.append(["Shift", str(recipe["Shift"])])
    rec_rows.append(["Total Charge (t)", f"{total_charge(recipe):.2f}"])
    t = Table(rec_rows, colWidths=[6 * cm, 8 * cm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D6B")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Prediction", styles["Heading2"]))
    story.append(Paragraph(f"Predicted TTT: {prediction.predicted_ttt:.2f} min (+/- {prediction.margin:.1f} min)", body))
    story.append(Paragraph(f"95% Interval: {prediction.ci_lower_95:.1f} - {prediction.ci_upper_95:.1f} min", body))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Industrial Interpretation", styles["Heading2"]))
    for line in interpretations:
        story.append(Paragraph(f"- {line}", body))
    story.append(Spacer(1, 12))

    if optimization is not None:
        story.append(Paragraph("Optimized Recipe", styles["Heading2"]))
        story.append(Paragraph(
            f"Current: {optimization.current_ttt:.2f} min -> Optimized: {optimization.optimized_ttt:.2f} min "
            f"(Saving: {optimization.improvement_min:.2f} min)",
            body,
        ))
        opt_rows = [["Variable", "Current", "Optimized", "Change"]]
        for col in CONTROLLABLE_NUMERIC:
            cur = float(recipe[col])
            opt = float(optimization.optimized_recipe[col])
            opt_rows.append([col, f"{cur:.2f}", f"{opt:.2f}", f"{opt - cur:+.2f}"])
        ot = Table(opt_rows, colWidths=[3.5 * cm, 3.5 * cm, 3.5 * cm, 3.5 * cm])
        ot.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D6B")), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
        story.append(ot)
        story.append(Spacer(1, 12))

    story.append(Paragraph("Top Feature Contributors", styles["Heading2"]))
    feat_rows = [["Feature", "Contribution"]] + [
        [r["feature"], f"{r['contribution']:.3f}"] for _, r in contributions.head(5).iterrows()
    ]
    ft = Table(feat_rows, colWidths=[8 * cm, 6 * cm])
    ft.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey)]))
    story.append(ft)

    if chart_path:
        story.append(Spacer(1, 12))
        story.append(Image(chart_path, width=14 * cm, height=8 * cm))

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        f"Footer: {COMPANY_NAME} EAF Decision Support | Model {MODEL_NAME} Phase 19 | "
        f"Optimizer {OPTIMIZER_VERSION} | v{APP_VERSION}",
        footer_style,
    ))
    doc.build(story)
    return buffer.getvalue()
