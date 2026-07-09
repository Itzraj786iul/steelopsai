"""Phase 29 — industrial explainability without modifying ML artifacts."""

from __future__ import annotations

import math
from collections import Counter
from functools import lru_cache
from typing import Any

import numpy as np
import pandas as pd

from app.services.industrial_validation import total_charge
from app.services.response_labels import ELECTRICAL_ENERGY_LABEL, format_display_name

CONTROLLABLE_NUMERIC = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]
BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]

SEVERITY_ORDER = ["Very Small", "Small", "Moderate", "Large", "Extreme"]
RISK_ORDER = ["Low", "Medium", "High"]

SHAP_INTERPRETATIONS: dict[str, str] = {
    "HM_X_POWER": "Shows how electrical energy demand scales with hot metal proportion — higher HM with lower energy often indicates efficient melting.",
    "POWER_PER_TONNE": "Electrical energy intensity per tonne of metallic charge — reflects how aggressively the heat is being melted.",
    "OXYGEN_PER_TONNE": "Oxygen intensity per tonne — higher values generally support faster oxidation and refining.",
    "BUCKET_X_CPC": "Interaction between scrap bucket charge and carbon paste — affects slag foaming and carbon balance.",
    "SOLID_BURDEN_RATIO": "Share of solid metallic charge in the burden — influences melting path and energy demand.",
    "HM_TO_DRI_RATIO": "Balance between hot metal and DRI — shifts the melting strategy between liquid and solid feed.",
    "BURDEN_SHARE_RANGE": "Spread across burden components — wide spreads can indicate unusual charge mixes.",
    "HM_TO_BUCKET_RATIO": "Hot metal relative to bucket scrap — affects initial temperature and melting sequence.",
    "BUCKET_X_DOLO": "Scrap bucket and dolomite interaction — influences slag basicity early in the heat.",
    "CPC_X_DRI": "Carbon paste with DRI — affects carbon availability during DRI melting.",
    "FLUX_PER_TONNE": "Flux loading per tonne — represents slag-forming intensity for the heat.",
    "FLUX_TO_CARBON_RATIO": "Flux relative to carbon input — important for slag chemistry and foaming.",
    "DOLO_X_LIME": "Dolomite and lime balance — controls slag basicity and refractory protection.",
    "DOLO_SQ": "Non-linear dolomite effect — captures diminishing returns at high dolomite levels.",
    "CPC_X_HBI": "Carbon paste interaction with HBI when present.",
    "DRI_TO_HBI_RATIO": "DRI versus HBI balance in the solid charge.",
    "BUCKET_X_HBI": "Bucket scrap with HBI — affects cold charge melting load.",
    "DOLO_X_HBI": "Dolomite with HBI — slag chemistry interaction when HBI is charged.",
    "HBI_SQ": "Non-linear HBI contribution when briquetted iron is used.",
    "SHIFT_LABEL": "Shift operating pattern — captures crew and shift-specific practice effects.",
    "SHIFT_C": "Shift C indicator — reflects shift-specific historical performance.",
    "CHARGE_BALANCE_ERROR": "Metallic charge accounting residual — flags unusual burden bookkeeping.",
}


def _severity_from_delta(delta: float, p5: float, p95: float) -> str:
    span = max(float(p95) - float(p5), 1e-6)
    ratio = abs(delta) / span
    if ratio < 0.05:
        return "Very Small"
    if ratio < 0.15:
        return "Small"
    if ratio < 0.35:
        return "Moderate"
    if ratio < 0.60:
        return "Large"
    return "Extreme"


def _risk_level(severity: str, within_band: bool, physics_ok: bool) -> str:
    if severity in {"Extreme", "Large"} or not within_band:
        return "High"
    if severity == "Moderate" or not physics_ok:
        return "Medium"
    return "Low"


def _acceptability(within_band: bool, severity: str, physics_ok: bool) -> str:
    if not physics_ok:
        return "Review physics"
    if not within_band and severity in {"Large", "Extreme"}:
        return "Outside historical practice"
    if within_band and severity in {"Very Small", "Small"}:
        return "Acceptable"
    if within_band:
        return "Acceptable with caution"
    return "Monitor closely"


@lru_cache(maxsize=1)
def _historical_enriched() -> pd.DataFrame:
    from app.services.ml_service import get_historical_raw

    df = get_historical_raw().copy()
    for col in CONTROLLABLE_NUMERIC:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    if "T C" in df.columns:
        df["Total_Charge"] = pd.to_numeric(df["T C"], errors="coerce")
    else:
        df["Total_Charge"] = df[BURDEN_COLS].sum(axis=1)
    if "TTT" in df.columns:
        df["TTT"] = pd.to_numeric(df["TTT"], errors="coerce")
    if "Heat Number" not in df.columns:
        df["Heat Number"] = df.index.astype(str)
    return df.dropna(subset=CONTROLLABLE_NUMERIC)


@lru_cache(maxsize=1)
def _similarity_basis() -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    df = _historical_enriched()
    matrix = df[CONTROLLABLE_NUMERIC].to_numpy(dtype=float)
    mean = matrix.mean(axis=0)
    std = matrix.std(axis=0)
    std[std < 1e-6] = 1.0
    return matrix, mean, std


def find_similar_heats(recipe: dict[str, Any], predicted_ttt: float, k: int = 5) -> list[dict[str, Any]]:
    df = _historical_enriched()
    matrix, mean, std = _similarity_basis()
    vec = np.array([float(recipe[c]) for c in CONTROLLABLE_NUMERIC], dtype=float)
    normed_query = (vec - mean) / std
    hist_norm = (matrix - mean) / std
    diff = hist_norm - normed_query
    distances = np.sqrt((diff * diff).sum(axis=1))
    order = np.argsort(distances)[:k]
    max_dist = float(np.percentile(distances, 95)) if len(distances) else 1.0
    max_dist = max(max_dist, 1e-6)

    results: list[dict[str, Any]] = []
    for idx in order:
        row = df.iloc[int(idx)]
        dist = float(distances[int(idx)])
        actual_ttt = float(row["TTT"]) if "TTT" in row and pd.notna(row["TTT"]) else None
        charge = float(row["Total_Charge"]) if pd.notna(row.get("Total_Charge")) else total_charge(recipe)
        similarity_pct = max(0.0, min(100.0, 100.0 * (1.0 - dist / max_dist)))
        results.append(
            {
                "heat_id": str(row.get("Heat Number", idx)),
                "shift": str(row.get("Shift", "—")),
                "charge_t": round(charge, 1),
                "actual_ttt": round(actual_ttt, 2) if actual_ttt is not None else None,
                "predicted_ttt": round(predicted_ttt, 2),
                "ttt_difference": round(actual_ttt - predicted_ttt, 2) if actual_ttt is not None else None,
                "similarity_pct": round(similarity_pct, 1),
                "distance": round(dist, 4),
            }
        )
    return results


def interpret_shap_feature(feature: str, contribution: float) -> str:
    base = SHAP_INTERPRETATIONS.get(
        feature,
        f"{format_display_name(feature)} influences predicted tap-to-tap time based on historical plant behaviour.",
    )
    direction = "increasing" if contribution > 0 else "decreasing"
    magnitude = "strongly" if abs(contribution) > 0.5 else "moderately" if abs(contribution) > 0.2 else "slightly"
    return f"{base} At this recipe it is {magnitude} {direction} predicted TTT."


def enrich_contributors(contributors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    enriched = []
    for item in contributors:
        contrib = float(item.get("contribution", 0))
        enriched.append(
            {
                **item,
                "interpretation": interpret_shap_feature(str(item.get("feature", "")), contrib),
                "direction": "increases TTT" if contrib > 0 else "decreases TTT",
            }
        )
    return enriched


def validate_recommendations(
    current: dict[str, Any],
    optimized: dict[str, Any],
    comparison: list[dict[str, Any]],
    stats: pd.DataFrame,
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in comparison:
        var = str(row["variable"])
        if var not in stats.index:
            continue
        s = stats.loc[var]
        p5, p95, median = float(s["p5"]), float(s["p95"]), float(s["median"])
        cur = float(row["current"])
        rec = float(row["optimized"])
        delta = float(row["difference"])
        pct = float(row["pct_change"])
        severity = _severity_from_delta(delta, p5, p95)
        within = p5 <= rec <= p95
        physics_ok = str(row.get("physics_status", "")).endswith("OK")
        risk = _risk_level(severity, within, physics_ok)
        rows.append(
            {
                **row,
                "historical_p5": p5,
                "historical_median": median,
                "historical_p95": p95,
                "historical_status": "Within P5–P95" if within else "Outside P5–P95",
                "severity": severity,
                "risk_level": risk,
                "industrial_acceptability": _acceptability(within, severity, physics_ok),
                "absolute_change": round(delta, 3),
                "percent_change": round(pct, 2),
            }
        )
    return rows


def compute_recommendation_stability(top5: pd.DataFrame) -> str:
    if top5 is None or top5.empty:
        return "Unknown"
    spread = 0.0
    for col in ["HM", "DRI", "POWER", "OXY"]:
        if col in top5.columns and len(top5) > 1:
            spread = max(spread, float(top5[col].max() - top5[col].min()))
    if spread < 1.5:
        return "High"
    if spread < 4.0:
        return "Medium"
    return "Low"


def build_top5_alternatives(top5: pd.DataFrame, current_ttt: float, hist_threshold: float) -> list[dict[str, Any]]:
    if top5 is None or top5.empty:
        return []
    alts: list[dict[str, Any]] = []
    for rank, (_, row) in enumerate(top5.iterrows(), start=1):
        ttt = float(row.get("Predicted_TTT", current_ttt))
        hist_dist = float(row.get("Hist_Distance", 0))
        similarity = max(0.0, min(100.0, 100.0 * (1.0 - hist_dist / max(hist_threshold, 1e-6))))
        penalty = float(row.get("Score", 0))
        alts.append(
            {
                "rank": rank,
                "predicted_ttt": round(ttt, 2),
                "improvement_min": round(current_ttt - ttt, 2),
                "risk_level": "Low" if float(row.get("Physics_Penalty", 0)) < 1 else "Medium",
                "confidence": "High" if similarity >= 70 else "Medium" if similarity >= 45 else "Low",
                "similarity_pct": round(similarity, 1),
                "total_penalty": round(penalty, 3),
                "hm": round(float(row.get("HM", 0)), 2),
                "dri": round(float(row.get("DRI", 0)), 2),
                "power": round(float(row.get("POWER", 0)), 0),
                "oxy": round(float(row.get("OXY", 0)), 0),
            }
        )
    return alts


def compute_recommendation_confidence(
    *,
    stability: str,
    variables_changed: int,
    hist_distance: float,
    hist_threshold: float,
    charge_deviation: float,
    physics_penalty: float,
    historical_penalty: float,
    similar_heats: list[dict[str, Any]],
) -> str:
    score = 100.0
    if stability == "Low":
        score -= 25
    elif stability == "Medium":
        score -= 10
    score -= min(20, variables_changed * 3)
    if hist_threshold > 0:
        score -= min(25, (hist_distance / hist_threshold) * 15)
    score -= min(15, charge_deviation * 2)
    score -= min(15, physics_penalty * 5)
    score -= min(10, historical_penalty * 3)
    if similar_heats:
        score += min(10, similar_heats[0]["similarity_pct"] / 10)
    if score >= 75:
        return "High"
    if score >= 55:
        return "Medium"
    if score >= 35:
        return "Low"
    return "Very Low"


def generate_recommendation_narrative(
    comparison: list[dict[str, Any]],
    similar_heats: list[dict[str, Any]],
) -> list[str]:
    narratives: list[str] = []
    significant = [r for r in comparison if abs(float(r.get("difference", 0))) > 0.05]
    significant.sort(key=lambda r: abs(float(r["difference"])), reverse=True)

    for row in significant[:3]:
        var = format_display_name(str(row["variable"]))
        delta = float(row["difference"])
        reason = str(row.get("reason", "")).strip()
        if reason:
            narratives.append(reason)
        elif delta < 0:
            narratives.append(
                f"Reducing {var} slightly is predicted to shorten tap-to-tap while keeping the burden within typical plant practice."
            )
        else:
            narratives.append(
                f"Increasing {var} supports the recommended melting path for this charge mix based on historical performance."
            )

    if similar_heats:
        best = similar_heats[0]
        narratives.append(
            f"Similar historical heat {best['heat_id']} (shift {best['shift']}, {best['charge_t']:.0f} t) "
            f"achieved {best['actual_ttt']:.1f} min TTT with {best['similarity_pct']:.0f}% recipe similarity."
        )

    power_row = next((r for r in comparison if r["variable"] == "POWER"), None)
    if power_row and float(power_row["difference"]) < -100:
        narratives.append(
            f"{ELECTRICAL_ENERGY_LABEL} is predicted to decrease because similar historical heats with this burden achieved lower tap-to-tap times."
        )

    hm_row = next((r for r in comparison if r["variable"] == "HM"), None)
    dri_row = next((r for r in comparison if r["variable"] == "DRI"), None)
    if hm_row and dri_row and float(hm_row["difference"]) < 0 and float(dri_row["difference"]) > 0:
        narratives.append(
            "Increasing DRI while slightly reducing HM maintains total metallic charge while improving burden balance."
        )

    return narratives[:5]


def industrial_observations(recipe: dict[str, Any], stats: pd.DataFrame) -> list[dict[str, str]]:
    obs: list[dict[str, str]] = []
    charge = total_charge(recipe)

    if int(recipe.get("Power_Restriction", 0)) == 1:
        obs.append({"observation": "Electrical restriction active", "severity": "warning"})

    if "HM" in stats.index:
        bounds = derive_charge_bounds_from_stats(stats)
        if charge < bounds["p5"] or charge > bounds["p95"]:
            obs.append({"observation": "Total charge outside normal historical band", "severity": "warning"})

    flux = float(recipe.get("LIME", 0)) + float(recipe.get("DOLO", 0))
    if "LIME" in stats.index:
        lime = float(recipe["LIME"])
        if lime > float(stats.loc["LIME", "p95"]) * 1.05 or lime < float(stats.loc["LIME", "p5"]) * 0.9:
            obs.append({"observation": "Flux loading outside typical range", "severity": "info"})

    if flux > 0 and abs(float(recipe.get("LIME", 0)) / max(float(recipe.get("DOLO", 0)), 0.1) - 4) > 2:
        obs.append({"observation": "Lime/dolomite ratio may be imbalanced", "severity": "info"})

    if "OXY" in stats.index and float(recipe["OXY"]) > float(stats.loc["OXY", "p95"]) * 1.05:
        obs.append({"observation": "High oxygen versus plant history", "severity": "info"})

    if float(recipe.get("Bucket", 0)) < float(stats.loc["Bucket", "p5"]) * 0.5 if "Bucket" in stats.index else False:
        obs.append({"observation": "Low scrap bucket contribution", "severity": "info"})

    if "HM" in stats.index and float(recipe["HM"]) > float(stats.loc["HM", "p95"]):
        obs.append({"observation": "High hot metal level", "severity": "info"})

    if "DRI" in stats.index and float(recipe["DRI"]) > float(stats.loc["DRI", "p95"]):
        obs.append({"observation": "High DRI level", "severity": "info"})

    return obs


def derive_charge_bounds_from_stats(stats: pd.DataFrame) -> dict[str, float]:
    p5 = sum(float(stats.loc[c, "p5"]) for c in BURDEN_COLS if c in stats.index)
    p95 = sum(float(stats.loc[c, "p95"]) for c in BURDEN_COLS if c in stats.index)
    median = sum(float(stats.loc[c, "median"]) for c in BURDEN_COLS if c in stats.index)
    return {"p5": p5, "p95": p95, "median": median}


def prediction_quality_indicator(
    confidence: str,
    charge_class: str,
    warning_count: int,
    similar_heats: list[dict[str, Any]],
) -> str:
    sim = similar_heats[0]["similarity_pct"] if similar_heats else 50.0
    if confidence in {"High"} and charge_class == "Normal" and warning_count <= 1 and sim >= 65:
        return "Excellent"
    if confidence in {"High", "Medium"} and warning_count <= 2 and sim >= 45:
        return "Good"
    if confidence != "Very Low" and warning_count <= 4:
        return "Acceptable"
    return "Experimental"


def digital_twin_readiness(stats_loaded: bool) -> dict[str, Any]:
    layers = {
        "prediction": {"score": 100, "status": "Deployed — Phase 19"},
        "optimizer": {"score": 100, "status": "Deployed — Phase 20.2"},
        "historical": {"score": 100 if stats_loaded else 40, "status": "Plant history loaded" if stats_loaded else "Limited"},
        "sensors": {"score": 15, "status": "Not integrated — Phase 27 P0 gap"},
        "scada": {"score": 10, "status": "Not integrated"},
        "delay_codes": {"score": 0, "status": "Not available"},
        "metallization": {"score": 0, "status": "Not available"},
    }
    overall = round(sum(v["score"] for v in layers.values()) / len(layers))
    return {"layers": layers, "overall_score": overall, "readiness_tier": "V1 Production" if overall < 50 else "V1+"}


def serialize_diagnostics(diagnostics: dict[str, Any]) -> dict[str, Any]:
    out = dict(diagnostics)
    rejections = out.get("rejections")
    if isinstance(rejections, Counter):
        out["rejections"] = dict(rejections)
    return out


def build_prediction_explainability(
    recipe: dict[str, Any],
    predict_result: dict[str, Any],
    stats: pd.DataFrame,
    stats_loaded: bool,
) -> dict[str, Any]:
    similar = find_similar_heats(recipe, float(predict_result["predicted_ttt"]))
    contributors = enrich_contributors(predict_result.get("top_contributors", []))
    quality = prediction_quality_indicator(
        str(predict_result.get("confidence", "Medium")),
        str(predict_result.get("charge_classification", "Normal")),
        len(predict_result.get("validation_warnings", [])),
        similar,
    )
    return {
        "similar_heats": similar,
        "contributor_interpretations": contributors,
        "prediction_quality": quality,
        "industrial_observations": industrial_observations(recipe, stats) if stats_loaded else [],
        "digital_twin_readiness": digital_twin_readiness(stats_loaded),
        "historical_similarity_pct": similar[0]["similarity_pct"] if similar else None,
        "industrial_risk": predict_result.get("operator_summary", {}).get("risk", "LOW"),
    }


def build_optimization_explainability(
    recipe: dict[str, Any],
    opt_result: dict[str, Any],
    opt_raw: Any,
    stats: pd.DataFrame,
    stats_loaded: bool,
) -> dict[str, Any]:
    comparison = validate_recommendations(
        recipe,
        opt_result["optimized_recipe"],
        opt_result["comparison"],
        stats if stats_loaded else pd.DataFrame(),
    )
    top5 = getattr(opt_raw, "top5", pd.DataFrame())
    diagnostics = serialize_diagnostics(opt_result.get("diagnostics", {}))
    hist_threshold = float(diagnostics.get("hist_extreme_threshold", 1.0))
    hist_distance = float(getattr(opt_raw, "best_historical_penalty", 0))
    if hasattr(opt_raw, "diagnostics") and "best_hist_distance" not in diagnostics:
        pass

    # Use top5 first row hist distance if available
    if not top5.empty and "Hist_Distance" in top5.columns:
        hist_distance = float(top5.iloc[0]["Hist_Distance"])

    stability = compute_recommendation_stability(top5)
    variables_changed = sum(1 for r in comparison if abs(float(r.get("difference", 0))) > 0.05)
    charge_dev = abs(total_charge(opt_result["optimized_recipe"]) - total_charge(recipe))
    similar = find_similar_heats(recipe, float(opt_result["current_ttt"]))

    rec_confidence = compute_recommendation_confidence(
        stability=stability,
        variables_changed=variables_changed,
        hist_distance=hist_distance,
        hist_threshold=hist_threshold,
        charge_deviation=charge_dev,
        physics_penalty=float(getattr(opt_raw, "best_physics_penalty", 0)),
        historical_penalty=float(getattr(opt_raw, "best_historical_penalty", 0)),
        similar_heats=similar,
    )

    return {
        "validated_recommendations": comparison,
        "recommendation_confidence": rec_confidence,
        "recommendation_stability": stability,
        "top5_alternatives": build_top5_alternatives(top5, float(opt_result["current_ttt"]), hist_threshold),
        "recommendation_narrative": generate_recommendation_narrative(comparison, similar),
        "penalty_breakdown": {
            "industrial": float(getattr(opt_raw, "best_industrial_penalty", 0)),
            "physics": float(getattr(opt_raw, "best_physics_penalty", 0)),
            "historical": float(getattr(opt_raw, "best_historical_penalty", 0)),
            "historical_distance": hist_distance,
        },
        "similar_heats": similar,
        "industrial_observations": industrial_observations(recipe, stats) if stats_loaded else [],
        "digital_twin_readiness": digital_twin_readiness(stats_loaded),
        "diagnostics": diagnostics,
    }
