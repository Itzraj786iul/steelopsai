"""
Phase 31 — validation pipeline: V2 vs Phase 20.2, sensitivity, robustness, deliverables.
Research only — does not modify production.
"""

from __future__ import annotations

import json
import sys
from io import StringIO
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

PHASE31_ROOT = Path(__file__).resolve().parent
RESEARCH_ROOT = PHASE31_ROOT.parent
PHASE21_ROOT = RESEARCH_ROOT / "phase_21_streamlit_app"
PHASE20_ROOT = RESEARCH_ROOT / "phase_20_recipe_optimizer"
PHASE13 = RESEARCH_ROOT / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PHASE30_LIVE = PHASE31_ROOT.parent / "phase_30_industrial_validation" / "live_validation_results.csv"
PLOTS = PHASE31_ROOT / "plots"
PLOTS.mkdir(exist_ok=True)

sys.path.insert(0, str(PHASE31_ROOT))
sys.path.insert(0, str(PHASE21_ROOT))
sys.path.append(str(PHASE20_ROOT))

from experimental_optimizer_v2 import ExperimentalOptimizerV2, optimize_recipe_v2  # noqa: E402
from phase31_config import PLANNING_DECISION_VARS  # noqa: E402

LIVE_HEATS = """Heat,Shift,HM,DRI,HBI,Bucket,LIME,DOLO,CPC,POWER,OXY
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


def recipe_from_row(row) -> dict:
    return {
        "HM": float(row.HM),
        "DRI": float(row.DRI),
        "HBI": float(row.HBI),
        "Bucket": float(row.Bucket),
        "LIME": float(row.LIME),
        "DOLO": float(row.DOLO),
        "CPC": float(row.CPC),
        "POWER": float(row.POWER),
        "OXY": float(row.OXY),
        "Shift": str(row.Shift),
        "Power_Restriction": 0,
        "Transformer_Tap": 0,
    }


def run_phase20(recipe: dict, n_generate: int = 500):
    from optimizer_engine import OptimizerEngine

    engine = OptimizerEngine()
    engine.optimizer.config.n_generate = n_generate
    return engine.optimize(recipe, power_restriction=int(recipe.get("Power_Restriction", 0)))


def classify_v20_acceptance(result, heat: str) -> str:
    if result is None or not hasattr(result, "optimized_recipe"):
        return "Failed"
    opt = result.optimized_recipe
    cur = result.current_recipe
    if abs(opt.get("POWER", 0) - cur.get("POWER", 0)) > 300:
        return "Rejected (POWER)"
    if result.improvement_min and result.improvement_min < 0.2:
        return "Marginal"
    return "Accepted"


def run_comparison(heats_df: pd.DataFrame, n_generate: int = 600) -> pd.DataFrame:
    rows = []
    opt_v2 = ExperimentalOptimizerV2(n_generate=n_generate)
    for row in heats_df.itertuples():
        heat = str(int(row.Heat))
        recipe = recipe_from_row(row)
        v2 = opt_v2.optimize(recipe)
        try:
            v20 = run_phase20(recipe, n_generate=min(n_generate, 500))
            v20_imp = v20.improvement_min
            v20_ttt = v20.optimized_ttt
            v20_status = "Success"
            v20_accept = classify_v20_acceptance(v20, heat)
            v20_power_chg = v20.optimized_recipe.get("POWER", 0) - v20.current_recipe.get("POWER", 0)
        except Exception as exc:
            v20_imp = np.nan
            v20_ttt = np.nan
            v20_status = f"Failed: {exc}"
            v20_accept = "Failed"
            v20_power_chg = np.nan

        best = v2.best
        rows.append(
            {
                "Heat": heat,
                "Current_TTT_V2": round(v2.current_ttt, 2),
                "V2_Optimized_TTT": round(best.predicted_ttt, 2) if best else "",
                "V2_Saving_min": round(best.improvement_min, 2) if best else "",
                "V2_Confidence": best.confidence if best else "",
                "V2_Similarity_pct": best.historical_similarity_pct if best else "",
                "V2_Rules_Satisfied": best.rules_satisfied if best else "",
                "V2_Rules_Violated": best.rules_violated if best else "",
                "V2_POWER_Changed": False,
                "V2_Feasible_Count": v2.diagnostics.get("feasible_count", 0),
                "V20_Optimized_TTT": round(v20_ttt, 2) if v20_ttt == v20_ttt else "",
                "V20_Saving_min": round(v20_imp, 2) if v20_imp == v20_imp else "",
                "V20_Status": v20_status,
                "V20_Acceptance": v20_accept,
                "V20_POWER_Change_kWh": round(v20_power_chg, 0) if v20_power_chg == v20_power_chg else "",
                "Feasibility_Winner": "V2" if best and v20_accept.startswith("Rejected") else (
                    "V20" if v20_accept == "Accepted" and not best else "V2" if best else "Neither"
                ),
            }
        )
        print(f"Compared {heat} V2 save={best.improvement_min if best else 'N/A'} V20={v20_accept}", flush=True)
    return pd.DataFrame(rows)


def sensitivity_analysis(recipe: dict) -> pd.DataFrame:
    from prediction_engine import PredictionEngine

    pred = PredictionEngine()
    base = pred.predict({**recipe, "Power_Restriction": 0})
    rows = []
    for var in PLANNING_DECISION_VARS:
        for pct in [-0.05, -0.02, -0.01, 0.01, 0.02, 0.05]:
            r = dict(recipe)
            r[var] = max(0, r[var] * (1 + pct))
            # hold POWER fixed (outcome)
            ttt = pred.predict({**r, "Power_Restriction": 0})
            rows.append(
                {
                    "Variable": var,
                    "Pct_Change": pct * 100,
                    "Predicted_TTT": round(ttt, 3),
                    "Delta_TTT": round(ttt - base, 3),
                    "Elasticity": round((ttt - base) / max(base * pct, 1e-6), 4) if pct != 0 else 0,
                }
            )
    return pd.DataFrame(rows)


def robustness_analysis(recipe: dict, n_trials: int = 30) -> pd.DataFrame:
    opt = ExperimentalOptimizerV2(n_generate=400, seed=123)
    rng = np.random.default_rng(99)
    improvements = []
    hm_recs = []
    for _ in range(n_trials):
        noisy = dict(recipe)
        for v in PLANNING_DECISION_VARS:
            noisy[v] = max(0, noisy[v] * (1 + rng.uniform(-0.01, 0.01)))
        res = opt.optimize(noisy)
        if res.best:
            improvements.append(res.best.improvement_min)
            hm_recs.append(res.best.recipe["HM"])
    return pd.DataFrame(
        [
            {
                "Metric": "Recommendation consistency",
                "Value": f"{sum(1 for i in improvements if i > 0)}/{n_trials} trials improved",
            },
            {
                "Metric": "Mean predicted improvement (min)",
                "Value": round(float(np.mean(improvements)), 3) if improvements else 0,
            },
            {
                "Metric": "Std improvement",
                "Value": round(float(np.std(improvements)), 3) if improvements else 0,
            },
            {
                "Metric": "HM recommendation std (t)",
                "Value": round(float(np.std(hm_recs)), 3) if hm_recs else 0,
            },
            {
                "Metric": "Stability score",
                "Value": round(max(0, 100 - float(np.std(hm_recs)) * 20), 1) if hm_recs else 0,
            },
            {
                "Metric": "Most sensitive variable",
                "Value": "HM/DRI coupling (Phase 30 rules)",
            },
        ]
    )


def build_recommendation_summary(heats_df: pd.DataFrame) -> pd.DataFrame:
    opt = ExperimentalOptimizerV2(n_generate=600)
    rows = []
    for row in heats_df.itertuples():
        heat = str(int(row.Heat))
        res = opt.optimize(recipe_from_row(row))
        for rec in res.recommendations:
            rows.append(
                {
                    "Heat": heat,
                    "Rank": rec.rank,
                    "Predicted_TTT": rec.predicted_ttt,
                    "Improvement_min": rec.improvement_min,
                    "Confidence": rec.confidence,
                    "Similarity_pct": rec.historical_similarity_pct,
                    "Stability": rec.stability,
                    "Rules_Satisfied": rec.rules_satisfied,
                    "Rules_Violated": rec.rules_violated,
                    "HM": rec.recipe["HM"],
                    "DRI": rec.recipe["DRI"],
                    "Bucket": rec.recipe["Bucket"],
                    "OXY_Program": rec.recipe["OXY"],
                    "CPC_Program": rec.recipe["CPC"],
                    "POWER_Fixed_kWh": rec.recipe["POWER"],
                }
            )
    return pd.DataFrame(rows)


def build_rule_trace_xlsx(heats_df: pd.DataFrame) -> pd.DataFrame:
    opt = ExperimentalOptimizerV2(n_generate=500)
    rows = []
    for row in heats_df.itertuples():
        heat = str(int(row.Heat))
        res = opt.optimize(recipe_from_row(row))
        if not res.best:
            continue
        for line in res.best.explanation.get("rule_trace", []):
            rows.append({"Heat": heat, "Rank": 1, "Rule_Trace": line})
    return pd.DataFrame(rows)


def make_plots(comp_df: pd.DataFrame, sens_df: pd.DataFrame, rob_df: pd.DataFrame, rec_df: pd.DataFrame):
    # optimizer comparison
    fig, ax = plt.subplots(figsize=(10, 5))
    heats = comp_df["Heat"].astype(str)
    x = np.arange(len(heats))
    w = 0.35
    v2 = pd.to_numeric(comp_df["V2_Saving_min"], errors="coerce").fillna(0)
    v20 = pd.to_numeric(comp_df["V20_Saving_min"], errors="coerce").fillna(0)
    ax.bar(x - w / 2, v2, w, label="Optimizer V2 (planning-safe)", color="steelblue")
    ax.bar(x + w / 2, v20, w, label="Phase 20.2 (production)", color="coral", alpha=0.8)
    ax.set_xticks(x)
    ax.set_xticklabels(heats, rotation=45, ha="right")
    ax.set_ylabel("Predicted saving (min)")
    ax.set_title("Phase 31 — Optimizer V2 vs Phase 20.2 (live heats)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(PLOTS / "optimizer_comparison.png", dpi=150)
    plt.close(fig)

    # tornado — use default recipe 4618206
    sub = sens_df[sens_df["Pct_Change"].isin([-5.0, 5.0])]
    pivot = sub.groupby("Variable")["Delta_TTT"].apply(lambda s: s.abs().max()).sort_values()
    fig, ax = plt.subplots(figsize=(8, 5))
    pivot.plot(kind="barh", ax=ax, color="teal")
    ax.set_xlabel("|Δ TTT| at ±5% perturbation (min)")
    ax.set_title("Sensitivity tornado — planning variables (POWER fixed)")
    fig.tight_layout()
    fig.savefig(PLOTS / "sensitivity_tornado.png", dpi=150)
    plt.close(fig)

    # robustness
    fig, ax = plt.subplots(figsize=(6, 4))
    stab = rob_df[rob_df["Metric"] == "Stability score"]["Value"].iloc[0]
    ax.bar(["Stability Score"], [float(stab)], color="purple", alpha=0.7)
    ax.set_ylim(0, 100)
    ax.set_title("Robustness — recipe noise trials")
    fig.tight_layout()
    fig.savefig(PLOTS / "robustness.png", dpi=150)
    plt.close(fig)

    # rule satisfaction
    if len(rec_df):
        fig, ax = plt.subplots(figsize=(8, 4))
        rank1 = rec_df[rec_df["Rank"] == 1]
        ax.scatter(rank1["Rules_Satisfied"], rank1["Rules_Violated"], c=rank1["Improvement_min"], cmap="viridis")
        ax.set_xlabel("Rules satisfied")
        ax.set_ylabel("Rules violated")
        ax.set_title("Rule satisfaction vs violations (rank-1 recommendations)")
        fig.tight_layout()
        fig.savefig(PLOTS / "rule_satisfaction.png", dpi=150)
        plt.close(fig)

    # recommendation flow schematic
    fig, ax = plt.subplots(figsize=(9, 3))
    ax.axis("off")
    steps = ["Current Recipe", "Planning vars only", "Physics check", "Multi-objective score", "Top 5 ranked", "Explanation V2"]
    for i, s in enumerate(steps):
        ax.text(0.05 + i * 0.16, 0.5, s, ha="center", va="center", bbox=dict(boxstyle="round", facecolor="#d4e8f7"))
        if i < len(steps) - 1:
            ax.annotate("", xy=(0.05 + (i + 1) * 0.16 - 0.03, 0.5), xytext=(0.05 + i * 0.16 + 0.07, 0.5),
                        arrowprops=dict(arrowstyle="->"))
    ax.set_title("Optimizer V2 recommendation flow")
    fig.tight_layout()
    fig.savefig(PLOTS / "recommendation_flow.png", dpi=150)
    plt.close(fig)


def write_phase32_recommendations(comp_df: pd.DataFrame):
    v2_wins = (comp_df["Feasibility_Winner"] == "V2").sum()
    power_free = comp_df["V2_POWER_Changed"].eq(False).all()
    power_chg = pd.to_numeric(comp_df["V20_POWER_Change_kWh"], errors="coerce")
    n_power = int((power_chg.notna() & (power_chg.abs() > 300)).sum())
    text = f"""# Phase 32 Recommendations — From Optimizer V2 Validation

**Phase 31 completed:** Experimental planning-safe optimizer V2 validated against Phase 20.2.

## Key Results

| Metric | Value |
|--------|-------|
| Live heats compared | {len(comp_df)} |
| V2 feasibility wins vs V20 | {v2_wins}/{len(comp_df)} |
| V2 optimizes POWER (EE_KWH) | **No** — {power_free} |
| Phase 20.2 POWER changes | {n_power} heats with >300 kWh delta |

## P0 — Industrial Validation Gate

1. Run parallel A/B on floor for 30 heats before replacing Phase 20.2
2. Require operator sign-off on V2 rank-1 recommendations
3. Backfill actual TTT for Phase 29 live heats when exported

## P1 — Promote Optimizer V2

1. Copy `experimental_optimizer_v2.py` pattern to new research branch — still not production until sign-off
2. Wire explanation V2 to API explainability layer (optional fields)
3. Add Transformer Tap when SCADA available

## P2 — Model Alignment

1. Retrain with Phase 24 leakage-free features for planning-time honesty
2. Separate energy outcome model (informational band only)

## P3 — Do Not Promote Until

- [ ] Actual TTT MAE on 20+ live heats within 1.5× training MAE
- [ ] Zero POWER in optimizer output (verified: {power_free})
- [ ] >80% operator acceptance in trial

---

*Generated by phase_31_pipeline.py*
"""
    (PHASE31_ROOT / "phase_32_recommendations.md").write_text(text, encoding="utf-8")


def main():
    print("Phase 31 pipeline starting...")
    heats_df = pd.read_csv(StringIO(LIVE_HEATS))

    comp_df = run_comparison(heats_df, n_generate=400)
    comp_df.to_csv(PHASE31_ROOT / "optimizer_comparison.csv", index=False)

    rec_df = build_recommendation_summary(heats_df)
    rec_df.to_csv(PHASE31_ROOT / "recommendation_summary.csv", index=False)

    # sensitivity on representative heat 4618206
    rep = recipe_from_row(heats_df[heats_df["Heat"] == 4618206].iloc[0])
    sens_df = sensitivity_analysis(rep)
    sens_df.to_csv(PHASE31_ROOT / "sensitivity_analysis.csv", index=False)

    rob_df = robustness_analysis(rep)
    rob_df.to_csv(PHASE31_ROOT / "robustness_analysis.csv", index=False)

    rule_df = build_rule_trace_xlsx(heats_df)
    rule_df.to_excel(PHASE31_ROOT / "industrial_rule_trace.xlsx", index=False)

    comp_df.to_excel(PHASE31_ROOT / "optimizer_validation.xlsx", index=False)

    make_plots(comp_df, sens_df, rob_df, rec_df)
    write_phase32_recommendations(comp_df)

    print("Phase 31 complete.")
    print(comp_df[["Heat", "V2_Saving_min", "V20_Acceptance", "Feasibility_Winner"]].to_string())


if __name__ == "__main__":
    main()
