"""
Phase 30 — Industrial Validation & Scientific Optimizer Redesign
Research-only pipeline. Does NOT modify production artifacts.
"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeRegressor, export_text

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
PLOTS = OUT / "plots"
PLOTS.mkdir(exist_ok=True)

PHASE13 = ROOT / "research" / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PHASE29_LIVE = ROOT / "backend" / "_phase_29_1_results.json"
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

RECIPE_COLS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]
BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]
PLANNING_OPT_COLS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "Target_Oxygen_Program", "Target_Carbon_Program", "Power_Restriction", "Transformer_Tap"]
LEGACY_OPT_COLS = RECIPE_COLS  # includes POWER — incorrect per Phase 30

LIVE_HEATS_CSV = """Heat,Shift,HM,DRI,HBI,Bucket,LIME,DOLO,CPC,POWER,OXY
4618213,B,65,38.7,0,28,8.9,1.2,678,36607,3340
4618212,B,60,43.2,0,16,9.6,1.3,806,34294,3082
4618211,B,58,39.7,0,17,10.2,1.7,392,36796,4021
4618210,B,50,46.2,0,17,10.1,1.8,270,39332,3763
4618209,B,55,66.1,0,0,11.3,2.0,377,37974,3900
4618208,B,60,69.1,0,0,12.0,1.9,595,38738,4537
4618207,B,62,54.7,0,13,10.6,2.0,634,35869,4001
4618206,B,60,46.1,0,15,9.4,1.6,625,32918,3831
4618205,B,58,46.6,0,15,8.8,2.0,585,34792,3288
4618204,B,50,25.1,0,15,12.5,2.1,674,34793,4802"""


def load_historical() -> pd.DataFrame:
    df = pd.read_csv(PHASE13)
    for c in RECIPE_COLS + ["T C", "TTT"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    df["Heat Number"] = df["Heat Number"].astype(str)
    return df.dropna(subset=["TTT"])


def build_variable_control_matrix() -> pd.DataFrame:
    rows = [
        {
            "Variable": "Hot Metal (HM)",
            "Measurement timing": "Before charging (planned tonnage)",
            "Control timing": "Charge planning / ladle dispatch",
            "Operator controllable": "Semi — within campaign limits",
            "Optimizer controllable": "Yes (Phase 30 redesign)",
            "Prediction input": "Yes — burden structure",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "Liquid iron input; sets thermal balance and oxygen demand. Coupled with DRI per JSPL practice (HM↑ often DRI↓).",
        },
        {
            "Variable": "DRI",
            "Measurement timing": "Before charging (weighed)",
            "Control timing": "Charge planning",
            "Operator controllable": "Semi — within availability",
            "Optimizer controllable": "Yes",
            "Prediction input": "Yes",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "Solid metallic feed; melting load and chemistry path. High DRI increases cold charge energy demand.",
        },
        {
            "Variable": "HBI",
            "Measurement timing": "Before charging",
            "Control timing": "Charge planning",
            "Operator controllable": "Yes (sparse at JSPL)",
            "Optimizer controllable": "Yes",
            "Prediction input": "Conditional",
            "Outcome variable": "No",
            "Confidence": "Medium",
            "Industrial notes": "Rare in JSPL cohort; include for completeness.",
        },
        {
            "Variable": "Bucket / Scrap",
            "Measurement timing": "Before charging",
            "Control timing": "Charge planning",
            "Operator controllable": "Yes",
            "Optimizer controllable": "Yes",
            "Prediction input": "Yes",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "Cold scrap increases arcing time and energy transfer demand.",
        },
        {
            "Variable": "LIME",
            "Measurement timing": "Before/during charging (planned)",
            "Control timing": "Flux program",
            "Operator controllable": "Yes",
            "Optimizer controllable": "Yes",
            "Prediction input": "Yes",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "Slag basicity control; excess lime extends refining.",
        },
        {
            "Variable": "DOLO",
            "Measurement timing": "Before/during charging",
            "Control timing": "Flux program",
            "Operator controllable": "Yes",
            "Optimizer controllable": "Yes",
            "Prediction input": "Yes",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "MgO source; paired with lime for refractory protection.",
        },
        {
            "Variable": "CPC (carbon paste)",
            "Measurement timing": "Uncertain — JSPL logs final consumption",
            "Control timing": "Injection program (setpoint)",
            "Operator controllable": "Yes — program target",
            "Optimizer controllable": "Yes as Target Carbon Program",
            "Prediction input": "Yes with timing caveat",
            "Outcome variable": "Partially — final total is response",
            "Confidence": "Medium",
            "Industrial notes": "Phase 30 treats CPC as carbon program target, not realized total.",
        },
        {
            "Variable": "OXY (oxygen)",
            "Measurement timing": "Uncertain — likely final Nm³ total",
            "Control timing": "Lance program (setpoint)",
            "Operator controllable": "Yes — program target",
            "Optimizer controllable": "Yes as Target Oxygen Program",
            "Prediction input": "Yes with timing caveat",
            "Outcome variable": "Partially",
            "Confidence": "Medium",
            "Industrial notes": "Optimize oxygen program, not ex-post consumption total.",
        },
        {
            "Variable": "Electrical Energy (POWER / EE_KWH)",
            "Measurement timing": "After heat completion (meter totalizer)",
            "Control timing": "Not directly — outcome of arc time × tap × restriction",
            "Operator controllable": "No — indirect via tap/restriction",
            "Optimizer controllable": "NO — remove from decision vector",
            "Prediction input": "Leakage risk if end-of-heat value used",
            "Outcome variable": "Yes",
            "Confidence": "High",
            "Industrial notes": "JSPL confirmed post-tap total. Phase 20.2 incorrectly optimizes kWh.",
        },
        {
            "Variable": "Power-on Time",
            "Measurement timing": "During heat (SCADA)",
            "Control timing": "Indirect via practice",
            "Operator controllable": "Semi",
            "Optimizer controllable": "No — outcome",
            "Prediction input": "Yes if available (missing at JSPL)",
            "Outcome variable": "Yes — TTT component",
            "Confidence": "High",
            "Industrial notes": "P0 missing variable per Phase 27; largest information gain.",
        },
        {
            "Variable": "Power Restriction",
            "Measurement timing": "During heat / campaign",
            "Control timing": "Grid or plant constraint",
            "Operator controllable": "No — exogenous",
            "Optimizer controllable": "Hard constraint only",
            "Prediction input": "Yes (flag)",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "Must cap recommendations when restriction active.",
        },
        {
            "Variable": "Transformer Tap",
            "Measurement timing": "During heat (if logged)",
            "Control timing": "Operator / auto tap changer",
            "Operator controllable": "Yes",
            "Optimizer controllable": "Yes as constraint setpoint",
            "Prediction input": "If telemetry available",
            "Outcome variable": "No",
            "Confidence": "Medium",
            "Industrial notes": "Not in current JSPL export — Phase 31 instrumentation.",
        },
        {
            "Variable": "Shift",
            "Measurement timing": "Planning",
            "Control timing": "Roster",
            "Operator controllable": "No",
            "Optimizer controllable": "No",
            "Prediction input": "Weak context",
            "Outcome variable": "No",
            "Confidence": "Low",
            "Industrial notes": "Crew practice proxy only.",
        },
        {
            "Variable": "Total Charge (T C)",
            "Measurement timing": "Before heat",
            "Control timing": "Planning constraint",
            "Operator controllable": "Semi",
            "Optimizer controllable": "Constraint",
            "Prediction input": "Yes (normalized)",
            "Outcome variable": "No",
            "Confidence": "High",
            "Industrial notes": "JSPL band historically 115–150 t; live heats include 90–132 t.",
        },
        {
            "Variable": "TTT (Tap-to-Tap)",
            "Measurement timing": "After tapping",
            "Control timing": "N/A",
            "Operator controllable": "No",
            "Optimizer controllable": "Objective only",
            "Prediction input": "Target",
            "Outcome variable": "Yes — primary",
            "Confidence": "High",
            "Industrial notes": "Prediction target; never an optimizer input.",
        },
        {
            "Variable": "Delay codes / Power-off",
            "Measurement timing": "During heat",
            "Control timing": "Operational response",
            "Operator controllable": "Partially",
            "Optimizer controllable": "No",
            "Prediction input": "Yes if logged (missing)",
            "Outcome variable": "Yes",
            "Confidence": "High",
            "Industrial notes": "Explains 299 shutdown-like heats in training data.",
        },
    ]
    return pd.DataFrame(rows)


def zscore_matrix(df: pd.DataFrame, cols: list[str]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    m = df[cols].to_numpy(dtype=float)
    mean = np.nanmean(m, axis=0)
    std = np.nanstd(m, axis=0)
    std[std < 1e-6] = 1.0
    return m, mean, std


def recipe_distance(a: np.ndarray, b: np.ndarray, mean: np.ndarray, std: np.ndarray) -> float:
    return float(np.sqrt(np.sum(((a - b) / std) ** 2)))


def outlier_score(recipe: dict, df: pd.DataFrame, cols: list[str]) -> float:
    m, mean, std = zscore_matrix(df, cols)
    vec = np.array([recipe[c] for c in cols], dtype=float)
    normed = (vec - mean) / std
    return float(np.linalg.norm(normed) / np.sqrt(len(cols)))


def find_similar(df: pd.DataFrame, recipe: dict, k: int = 5) -> pd.DataFrame:
    m, mean, std = zscore_matrix(df, RECIPE_COLS)
    vec = np.array([recipe[c] for c in RECIPE_COLS], dtype=float)
    dists = []
    for i, row in enumerate(m):
        d = recipe_distance(vec, row, mean, std)
        dists.append((d, i))
    dists.sort(key=lambda x: x[0])
    idx = [i for _, i in dists[:k]]
    return df.iloc[idx].copy()


def classify_feasibility(row: dict, validated: list[dict]) -> tuple[str, str]:
    """Classify optimizer recommendation feasibility for operators."""
    if row.get("opt_error"):
        return "Impossible", row["opt_error"]
    power_adj = next((v for v in validated if v.get("variable") == "POWER"), None)
    if power_adj and abs(power_adj.get("difference", 0)) > 500:
        return "Rejected", "Recommends large electrical energy change — not operator-controllable at planning time"
    extreme = [v for v in validated if v.get("severity") in ("Large", "Extreme")]
    if extreme:
        return "Questionable", f"{len(extreme)} variables at Large/Extreme severity"
    outside = [v for v in validated if "Outside" in str(v.get("historical_status", ""))]
    if len(outside) >= 2:
        return "Questionable", "Multiple variables outside historical P5–P95"
    physics_bad = [v for v in validated if "Physics X" in str(v.get("physics_status", ""))]
    if len(physics_bad) >= 2:
        return "Questionable", "Multiple physics violations flagged"
    if row.get("saving", 0) and row["saving"] < 0.3:
        return "Questionable", "Marginal saving (<0.3 min) — not worth operational change"
    return "Accepted", "Within historical bands; burden rebalance only; modest TTT improvement"


def run_live_validation(hist: pd.DataFrame) -> pd.DataFrame:
    from app.services.ml_service import optimize_recipe, predict_recipe

    live = pd.read_csv(pd.io.common.StringIO(LIVE_HEATS_CSV))
    phase29 = {}
    if PHASE29_LIVE.exists():
        phase29 = {r["heat"]: r for r in json.loads(PHASE29_LIVE.read_text())["results"]}

    rows = []
    for _, h in live.iterrows():
        heat_id = str(int(h["Heat"]))
        recipe = {
            "HM": float(h["HM"]),
            "DRI": float(h["DRI"]),
            "HBI": float(h["HBI"]),
            "Bucket": float(h["Bucket"]),
            "LIME": float(h["LIME"]),
            "DOLO": float(h["DOLO"]),
            "CPC": float(h["CPC"]),
            "POWER": float(h["POWER"]),
            "OXY": float(h["OXY"]),
            "Shift": str(h["Shift"]),
            "Power_Restriction": 0,
        }
        charge = recipe["HM"] + recipe["DRI"] + recipe["HBI"] + recipe["Bucket"]
        pred = predict_recipe(recipe)
        exp = pred.get("explainability") or {}

        opt_error = None
        opt = None
        if heat_id in phase29 and phase29[heat_id].get("opt_error") is None:
            opt = phase29[heat_id]
        else:
            try:
                opt_raw = optimize_recipe(recipe, n_generate=500)
                opt = {
                    "current_ttt": opt_raw["current_ttt"],
                    "optimized_ttt": opt_raw["optimized_ttt"],
                    "saving": opt_raw["improvement_min"],
                    "opt_error": None,
                    "validated": (opt_raw.get("explainability") or {}).get("validated_recommendations", []),
                    "rec_confidence": (opt_raw.get("explainability") or {}).get("recommendation_confidence"),
                }
            except Exception as exc:
                opt_error = str(exc)
                opt = {"opt_error": opt_error, "validated": []}

        actual_row = hist[hist["Heat Number"] == heat_id]
        actual_ttt = float(actual_row["TTT"].iloc[0]) if len(actual_row) else np.nan
        pred_ttt = float(pred["predicted_ttt"])
        abs_err = abs(pred_ttt - actual_ttt) if not np.isnan(actual_ttt) else np.nan

        validated = opt.get("validated", []) if opt else []
        feasibility, feas_reason = classify_feasibility(
            {"opt_error": opt.get("opt_error") if opt else opt_error, "saving": opt.get("saving") if opt else None, "validated": validated},
            validated,
        )

        rows.append(
            {
                "Heat": heat_id,
                "Shift": recipe["Shift"],
                "Total_Charge_t": round(charge, 1),
                "Actual_TTT_min": actual_ttt if not np.isnan(actual_ttt) else "Pending",
                "Predicted_TTT_min": round(pred_ttt, 2),
                "Abs_Prediction_Error_min": round(abs_err, 2) if not np.isnan(abs_err) else "Pending",
                "CI_Lower_95": round(pred["ci_lower_95"], 2),
                "CI_Upper_95": round(pred["ci_upper_95"], 2),
                "Confidence": pred["confidence"],
                "Charge_Classification": pred["charge_classification"],
                "Historical_Similarity_pct": round(exp.get("historical_similarity_pct") or 0, 1),
                "Outlier_Score": round(outlier_score(recipe, hist, RECIPE_COLS), 3),
                "Validation_Warnings": "; ".join(
                    w["message"] if isinstance(w, dict) else str(w) for w in pred.get("validation_warnings", [])
                ),
                "Current_Predicted_TTT": round(opt["current_ttt"], 2) if opt and opt.get("current_ttt") else pred_ttt,
                "Optimized_TTT": round(opt["optimized_ttt"], 2) if opt and opt.get("optimized_ttt") else "",
                "Expected_Saving_min": round(opt["saving"], 2) if opt and opt.get("saving") is not None else "",
                "Optimizer_Status": "Failed" if (opt and opt.get("opt_error")) or opt_error else "Success",
                "Recommendation_Confidence": opt.get("rec_confidence", "") if opt else "",
                "Industrial_Feasibility": feasibility,
                "Feasibility_Reason": feas_reason,
                "Industrial_Remarks": "; ".join(
                    o.get("observation", "") for o in exp.get("industrial_observations", [])
                ),
            }
        )
    return pd.DataFrame(rows)


def build_optimizer_feasibility(live_df: pd.DataFrame, phase29_results: list[dict]) -> pd.DataFrame:
    rows = []
    for r in phase29_results:
        heat = r["heat"]
        if r.get("opt_error"):
            rows.append(
                {
                    "Heat": heat,
                    "Variable": "ALL",
                    "Current": "",
                    "Recommended": "",
                    "Change": "",
                    "Classification": "Impossible",
                    "Reason": r["opt_error"],
                }
            )
            continue
        for v in r.get("validated", []):
            if abs(v.get("difference", 0)) < 0.05:
                continue
            var = v.get("display_name") or v.get("variable")
            cls = "Accepted"
            reason = v.get("industrial_acceptability", "")
            if v.get("variable") == "POWER":
                cls = "Rejected"
                reason = "Electrical energy is an outcome, not a planning decision"
            elif v.get("severity") in ("Large", "Extreme"):
                cls = "Questionable"
            elif "Outside" in str(v.get("historical_status", "")):
                cls = "Questionable"
            elif "Physics X" in str(v.get("physics_status", "")):
                cls = "Questionable"
                reason = v.get("physics_status", "")
            rows.append(
                {
                    "Heat": heat,
                    "Variable": var,
                    "Current": v.get("current"),
                    "Recommended": round(v.get("optimized", 0), 2),
                    "Change": round(v.get("difference", 0), 2),
                    "Pct_Change": round(v.get("pct_change", 0), 2),
                    "Severity": v.get("severity"),
                    "Classification": cls,
                    "Reason": reason,
                }
            )
    return pd.DataFrame(rows)


def build_failure_analysis(phase29_results: list[dict], hist: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for r in phase29_results:
        if not r.get("opt_error"):
            continue
        heat = r["heat"]
        live_rec = next(
            (
                x
                for x in pd.read_csv(pd.io.common.StringIO(LIVE_HEATS_CSV)).itertuples()
                if str(int(x.Heat)) == heat
            ),
            None,
        )
        if live_rec is None:
            continue
        recipe = {
            "HM": live_rec.HM,
            "DRI": live_rec.DRI,
            "CPC": live_rec.CPC,
            "POWER": live_rec.POWER,
            "OXY": live_rec.OXY,
        }
        charge = live_rec.HM + live_rec.DRI + live_rec.HBI + live_rec.Bucket
        num_hist = hist[RECIPE_COLS + ["T C", "TTT"]]
        p5 = num_hist.quantile(0.05)
        p95 = num_hist.quantile(0.95)
        causes = []
        if recipe["CPC"] < p5["CPC"]:
            causes.append("Historical boundary — CPC below P5")
        if recipe["POWER"] > p95["POWER"]:
            causes.append("Historical boundary — Power above P95")
        if recipe["OXY"] > p95["OXY"]:
            causes.append("Historical boundary — OXY above P95")
        if recipe["DRI"] < p5["DRI"]:
            causes.append("Historical boundary — DRI below P5")
        if charge < 100:
            causes.append("Charge below normal campaign band")
        if not causes:
            causes.append("Search failure — no physics-compliant local candidates")
        rows.append(
            {
                "Heat": heat,
                "Error": r["opt_error"],
                "Predicted_TTT": r["predicted_ttt"],
                "Total_Charge": round(charge, 1),
                "CPC": recipe["CPC"],
                "POWER_kWh": recipe["POWER"],
                "OXY_Nm3": recipe["OXY"],
                "Primary_Cause": causes[0],
                "Contributing_Factors": "; ".join(causes),
                "Physics_Constraint": "Yes" if "physics" in r["opt_error"].lower() else "Likely",
                "Historical_Boundary": "Yes" if any("boundary" in c for c in causes) else "Partial",
                "Missing_Variable": "Power restriction / tap not in search space",
                "Recommended_Fix": "Redesign optimizer without POWER; widen only planning variables",
            }
        )
    return pd.DataFrame(rows)


def build_similarity_validation(hist: pd.DataFrame, live_df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    live = pd.read_csv(pd.io.common.StringIO(LIVE_HEATS_CSV))
    for _, h in live.iterrows():
        heat_id = str(int(h["Heat"]))
        recipe = {c: float(h[c]) for c in RECIPE_COLS}
        sim = find_similar(hist, recipe, k=5)
        pred_row = live_df[live_df["Heat"] == heat_id].iloc[0]
        pred_ttt = float(pred_row["Predicted_TTT_min"])
        for rank, (_, srow) in enumerate(sim.iterrows(), 1):
            recipe_sim = 100 * max(0, 1 - recipe_distance(
                np.array([recipe[c] for c in RECIPE_COLS]),
                srow[RECIPE_COLS].to_numpy(dtype=float),
                *zscore_matrix(hist, RECIPE_COLS)[1:],
            ) / (np.percentile([recipe_distance(
                np.array([recipe[c] for c in RECIPE_COLS]),
                hist.iloc[i][RECIPE_COLS].to_numpy(dtype=float),
                *zscore_matrix(hist, RECIPE_COLS)[1:],
            ) for i in range(min(500, len(hist)))], 95) or 1))
            ttt_diff = abs(float(srow["TTT"]) - pred_ttt)
            outcome_sim = max(0, 100 - ttt_diff * 5)
            truly_similar = "Yes" if recipe_sim > 75 and ttt_diff < 8 else "Partial" if recipe_sim > 60 else "No"
            rows.append(
                {
                    "Query_Heat": heat_id,
                    "Rank": rank,
                    "Similar_Heat": srow["Heat Number"],
                    "Similar_Shift": srow["Shift"],
                    "Recipe_Similarity_pct": round(recipe_sim, 1),
                    "Outcome_Similarity_pct": round(outcome_sim, 1),
                    "Similar_Heat_TTT": srow["TTT"],
                    "Query_Predicted_TTT": pred_ttt,
                    "TTT_Difference_min": round(ttt_diff, 1),
                    "Burden_Match": abs(srow["T C"] - (h["HM"] + h["DRI"] + h["Bucket"])) < 15,
                    "Truly_Similar": truly_similar,
                }
            )
    return pd.DataFrame(rows)


def mine_operating_rules(hist: pd.DataFrame) -> list[str]:
  rules = []
  df = hist.copy()
  df["HM_high"] = df["HM"] > df["HM"].median()
  df["DRI_high"] = df["DRI"] > df["DRI"].median()
  df["Bucket_high"] = df["Bucket"] > df["Bucket"].median()
  df["LIME_high"] = df["LIME"] > df["LIME"].median()

  # HM up -> OXY down?
  hm_up = df[df["HM"] > df["HM"].quantile(0.75)]
  hm_low = df[df["HM"] < df["HM"].quantile(0.25)]
  if hm_up["OXY"].mean() < hm_low["OXY"].mean():
    rules.append(f"**HM↑ → Oxygen↓** — High-HM heats (>{df['HM'].quantile(0.75):.0f} t) average OXY {hm_up['OXY'].mean():.0f} Nm³ vs {hm_low['OXY'].mean():.0f} Nm³ for low-HM (pooled historical, n={len(df)}).")

  # HM up -> DRI down
  corr = df["HM"].corr(df["DRI"])
  rules.append(f"**HM↑ ↔ DRI↓** — Pearson correlation HM–DRI = {corr:.2f} across JSPL historical heats.")

  # Bucket up -> Power up
  bucket_yes = df[df["Bucket"] > 5]
  bucket_no = df[df["Bucket"] <= 5]
  if len(bucket_yes) > 100:
    rules.append(f"**Bucket↑ → Energy↑** — Heats with scrap bucket >5 t average POWER {bucket_yes['POWER'].mean():.0f} kWh vs {bucket_no['POWER'].mean():.0f} kWh without.")

  # Lime high -> longer TTT
  lime_high = df[df["LIME"] > df["LIME"].quantile(0.75)]
  lime_low = df[df["LIME"] < df["LIME"].quantile(0.25)]
  rules.append(f"**High Lime → Longer TTT** — P75 lime heats average TTT {lime_high['TTT'].mean():.1f} min vs {lime_low['TTT'].mean():.1f} min for P25.")

  # Decision tree rule on TTT
  X = df[RECIPE_COLS].fillna(0)
  y = df["TTT"]
  tree = DecisionTreeRegressor(max_depth=3, min_samples_leaf=200, random_state=42)
  tree.fit(X, y)
  rules.append("**Decision tree splits (max_depth=3):**\n```\n" + export_text(tree, feature_names=RECIPE_COLS) + "\n```")

  # Partial dependence style: HM quartile vs TTT
  df["hm_q"] = pd.qcut(df["HM"], 4, duplicates="drop")
  pd_mean = df.groupby("hm_q", observed=True)["TTT"].mean()
  rules.append("**HM quartile vs mean TTT:** " + ", ".join(f"{idx}: {val:.1f} min" for idx, val in pd_mean.items()))

  return rules


def build_scientific_review(phase29_results: list[dict]) -> pd.DataFrame:
    rows = []
    patterns = {
        "HM": "Minor HM–DRI rebalance within charge",
        "DRI": "Compensate HM change; maintain metallic total",
        "POWER": "Reduce electrical energy 3–5%",
        "OXY": "Trim or hold oxygen program",
        "CPC": "Adjust carbon injection ±5–8%",
        "LIME": "Slight flux reduction",
        "Bucket": "Reduce scrap 1–2 t when present",
    }
    lit = {
        "HM": "Kirschen et al. 2011 — liquid steel input reduces melting duty",
        "DRI": "Memoli et al. 2021 — DRI share affects melting path",
        "POWER": "Knutsen 2020 — energy is outcome of arcing time, not setpoint",
        "OXY": "Duan et al. 2014 — oxygen intensity drives refining",
        "CPC": "Morales et al. 2025 — carbon for foaming/slag",
        "LIME": "Memoli 2021 — flux affects slag volume and refining",
        "Bucket": "Štore Steel 2019 — scrap increases cold charge load",
    }
    jspl = {
        "HM": "Operators adjust HM/DRI together, not in isolation",
        "DRI": "High DRI campaigns require more energy — cannot cut power simultaneously",
        "POWER": "Operators do NOT set kWh before heat — rejected by JSPL practice",
        "OXY": "Oxygen program set early; final Nm³ is outcome",
        "CPC": "Carbon adjusted for foaming; extreme CPC changes rare mid-campaign",
        "LIME": "Flux changes require quality approval",
        "Bucket": "Scrap availability limits bucket changes",
    }
    for r in phase29_results:
        if r.get("opt_error"):
            continue
        for v in r.get("validated", []):
            if abs(v.get("difference", 0)) < 0.05:
                continue
            var = v.get("variable", "")
            current_rec = f"{var} {v.get('arrow','')} ({v.get('pct_change',0):+.1f}%)"
            industrial = patterns.get(var, "Review manually")
            if var == "POWER":
                industrial = "DO NOT change kWh at planning — use tap/restriction instead"
            agreement = "Disagree" if var == "POWER" else "Partial" if v.get("severity") in ("Moderate", "Large") else "Agree"
            rows.append(
                {
                    "Heat": r["heat"],
                    "Variable": var,
                    "Current_Recommendation": current_rec,
                    "Industrial_Best_Practice": industrial,
                    "Literature_Recommendation": lit.get(var, ""),
                    "JSPL_Operator_Expectation": jspl.get(var, ""),
                    "Agreement": agreement,
                }
            )
    return pd.DataFrame(rows)


def make_plots(hist: pd.DataFrame, live_df: pd.DataFrame, phase29: dict, sim_df: pd.DataFrame, fail_df: pd.DataFrame):
    # validation errors — use historical backtest on shift B recent heats as proxy where live actual pending
    recent = hist[(hist["Shift"] == "B") & (hist["TTT"] < 120)].tail(200)
    try:
        from app.services.ml_service import predict_recipe
        errs = []
        for _, row in recent.iterrows():
            recipe = {c: float(row[c]) for c in RECIPE_COLS}
            recipe["Shift"] = row["Shift"]
            recipe["Power_Restriction"] = 0
            p = predict_recipe(recipe)["predicted_ttt"]
            errs.append(abs(p - row["TTT"]))
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.hist(errs, bins=25, color="steelblue", edgecolor="white")
        ax.axvline(np.mean(errs), color="red", linestyle="--", label=f"MAE proxy {np.mean(errs):.2f} min")
        ax.set_xlabel("Absolute prediction error (min)")
        ax.set_ylabel("Count")
        ax.set_title("Phase 30 — Historical backtest errors (Shift B, recent 200 heats)")
        ax.legend()
        fig.tight_layout()
        fig.savefig(PLOTS / "validation_errors.png", dpi=150)
        plt.close(fig)
    except Exception:
        pass

    # optimizer failures
    if len(fail_df):
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.bar(fail_df["Heat"].astype(str), [1] * len(fail_df), color="coral")
        ax.set_title("Optimizer failures — live HMI heats")
        ax.set_ylabel("Failed")
        fig.tight_layout()
        fig.savefig(PLOTS / "optimizer_failures.png", dpi=150)
        plt.close(fig)

    # similarity clusters
    if len(sim_df):
        fig, ax = plt.subplots(figsize=(7, 5))
        ax.scatter(sim_df["Recipe_Similarity_pct"], sim_df["Outcome_Similarity_pct"], alpha=0.6)
        ax.set_xlabel("Recipe similarity %")
        ax.set_ylabel("Outcome similarity %")
        ax.set_title("Similar heat validation — recipe vs outcome match")
        ax.axhline(70, color="gray", linestyle=":")
        ax.axvline(75, color="gray", linestyle=":")
        fig.tight_layout()
        fig.savefig(PLOTS / "similarity_clusters.png", dpi=150)
        plt.close(fig)

    # rule network — HM vs DRI colored by TTT
    fig, ax = plt.subplots(figsize=(7, 5))
    sc = ax.scatter(hist["HM"], hist["DRI"], c=hist["TTT"], cmap="viridis", s=5, alpha=0.4)
    plt.colorbar(sc, label="TTT (min)")
    ax.set_xlabel("HM (t)")
    ax.set_ylabel("DRI (t)")
    ax.set_title("Burden rule network — HM vs DRI (color = TTT)")
    fig.tight_layout()
    fig.savefig(PLOTS / "rule_network.png", dpi=150)
    plt.close(fig)

    # causal graph placeholder — simple flow rendered via matplotlib
    fig, ax = plt.subplots(figsize=(10, 3))
    ax.axis("off")
    boxes = ["Recipe\nVariables", "Melting", "Arc\nStability", "Slag", "Energy\nTransfer", "Refining", "TTT"]
    for i, b in enumerate(boxes):
        ax.text(0.05 + i * 0.14, 0.5, b, ha="center", va="center", bbox=dict(boxstyle="round", facecolor="lightblue"))
        if i < len(boxes) - 1:
            ax.annotate("", xy=(0.05 + (i + 1) * 0.14 - 0.04, 0.5), xytext=(0.05 + i * 0.14 + 0.06, 0.5),
                        arrowprops=dict(arrowstyle="->", lw=1.5))
    ax.set_title("Industrial causal chain (simplified)")
    fig.tight_layout()
    fig.savefig(PLOTS / "causal_graph.png", dpi=150)
    plt.close(fig)


def main():
    print("Phase 30 pipeline starting...")
    hist = load_historical()

    # Part 2
    vcm = build_variable_control_matrix()
    vcm.to_excel(OUT / "variable_control_matrix.xlsx", index=False)

    # Part 5
    live_df = run_live_validation(hist)
    live_df.to_csv(OUT / "live_validation_results.csv", index=False)

    phase29 = json.loads(PHASE29_LIVE.read_text()) if PHASE29_LIVE.exists() else {"results": []}
    results = phase29.get("results", [])

    # Part 6
    feas = build_optimizer_feasibility(live_df, results)
    feas.to_excel(OUT / "optimizer_feasibility_review.xlsx", index=False)

    # Part 8
    sim_df = build_similarity_validation(hist, live_df)
    sim_df.to_excel(OUT / "similarity_validation.xlsx", index=False)

    # Part 10
    fail_df = build_failure_analysis(results, hist)
    fail_df.to_excel(OUT / "optimizer_failure_analysis.xlsx", index=False)

    # Part 12
    sci = build_scientific_review(results)
    sci.to_excel(OUT / "optimizer_scientific_review.xlsx", index=False)

    # Part 7 — write rules md
    rules = mine_operating_rules(hist)
    (OUT / "industrial_operating_rules.md").write_text(
        "# Industrial Operating Rules — Mined from JSPL Historical Data\n\n"
        + "\n\n".join(f"{i+1}. {r}" for i, r in enumerate(rules))
        + "\n\n---\n*Generated by phase_30_pipeline.py — research only.*\n",
        encoding="utf-8",
    )

    make_plots(hist, live_df, phase29, sim_df, fail_df)
    print("Phase 30 data artifacts complete.")
    print(f"  live heats: {len(live_df)}")
    print(f"  feasibility rows: {len(feas)}")
    print(f"  failure rows: {len(fail_df)}")


if __name__ == "__main__":
    main()
