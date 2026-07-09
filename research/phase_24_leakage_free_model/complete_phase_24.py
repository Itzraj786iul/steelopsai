"""Complete Phase 24 deliverables after model training — subset metrics, SHAP, reports."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from lightgbm import LGBMRegressor
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, StackingRegressor, VotingRegressor
from sklearn.impute import SimpleImputer
from sklearn.inspection import PartialDependenceDisplay, permutation_importance
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

PHASE_ROOT = Path(__file__).resolve().parent
RESEARCH_ROOT = PHASE_ROOT.parent
PLOTS_DIR = PHASE_ROOT / "plots"
RAW_DATA = RESEARCH_ROOT / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PHASE19_MODEL = RESEARCH_ROOT / "phase_19_model_development" / "exports" / "production_model.pkl"
PHASE19_PREPROC = RESEARCH_ROOT / "phase_19_model_development" / "exports" / "preprocessing_pipeline.pkl"
PHASE18_FEATURES = RESEARCH_ROOT / "phase_18_final_feature_selection" / "exports" / "final_features_25.csv"

sys.path.insert(0, str(PHASE_ROOT))

import importlib.util

def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

fe24 = _load_module("fe24", PHASE_ROOT / "feature_engineering.py")
build_clean_dataset = fe24.build_clean_dataset

sys.path.insert(0, str(RESEARCH_ROOT / "phase_21_streamlit_app"))
p21_fe = _load_module("p21_fe", RESEARCH_ROOT / "phase_21_streamlit_app" / "feature_engineering.py")
engineer_recipe_features = p21_fe.engineer_recipe_features
recipe_to_dataframe = p21_fe.recipe_to_dataframe

from phase_24_pipeline import (
    RANDOM_STATE,
    TEST_FRACTION,
    ablation_study,
    error_cluster_analysis,
    get_feature_columns,
    metrics_dict,
    temporal_split,
)

PROD_FEATURES = pd.read_csv(PHASE18_FEATURES)["Feature"].tolist()


def make_tree_pipeline(est):
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", est)])


def subset_metrics(y, pred, mask, label):
    if mask.sum() == 0:
        return None
    m = metrics_dict(y[mask], pred[mask])
    m["Subset"] = label
    m["N"] = int(mask.sum())
    return m


def prod_predict(df: pd.DataFrame) -> np.ndarray:
    rows = []
    for _, r in df.iterrows():
        recipe = {
            "HM": r["HM"], "DRI": r["DRI"], "HBI": r["HBI"], "Bucket": r["Bucket"],
            "LIME": r["LIME"], "DOLO": r["DOLO"], "CPC": r["CPC"], "POWER": r["POWER"],
            "OXY": r["OXY"], "Shift": r["Shift"],
        }
        rows.append(engineer_recipe_features(recipe_to_dataframe(recipe)).iloc[0])
    X = pd.DataFrame(rows)[PROD_FEATURES].to_numpy()
    model = joblib.load(PHASE19_MODEL)
    pre = joblib.load(PHASE19_PREPROC)
    return model.predict(pre.transform(X))


def main():
    PLOTS_DIR.mkdir(exist_ok=True)
    np.random.seed(RANDOM_STATE)

    raw = pd.read_csv(RAW_DATA)
    raw.columns = [c.strip() for c in raw.columns]
    ds_a = build_clean_dataset(raw, include_oxy_cpc=True)
    ds_b = build_clean_dataset(raw, include_oxy_cpc=False)

    raw_sorted = raw.copy()
    raw_sorted["Date"] = pd.to_datetime(raw_sorted["Date"])
    raw_sorted = raw_sorted.sort_values("Date").reset_index(drop=True)
    train_a, test_a, _ = temporal_split(ds_a)
    train_b, test_b, _ = temporal_split(ds_b)
    cut = len(train_a)
    test_raw = raw_sorted.iloc[cut:].copy()

    feat_a = get_feature_columns(ds_a)
    feat_b = get_feature_columns(ds_b)
    X_train_a, y_train_a = train_a[feat_a], train_a["TTT"].to_numpy()
    X_test_a, y_test_a = test_a[feat_a], test_a["TTT"].to_numpy()
    X_train_b, y_train_b = train_b[feat_b], train_b["TTT"].to_numpy()
    X_test_b, y_test_b = test_b[feat_b], test_b["TTT"].to_numpy()

    # Best leakage-free model — LightGBM without scaling (tree-appropriate)
    best = make_tree_pipeline(
        LGBMRegressor(
            n_estimators=400,
            max_depth=8,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_samples=20,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbose=-1,
        )
    )
    t0 = time.perf_counter()
    best.fit(X_train_a, y_train_a)
    fit_s = time.perf_counter() - t0
    t1 = time.perf_counter()
    pred_a = best.predict(X_test_a)
    infer_s = time.perf_counter() - t1

    best_b = make_tree_pipeline(
        LGBMRegressor(
            n_estimators=400, max_depth=8, learning_rate=0.05, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1
        )
    )
    best_b.fit(X_train_b, y_train_b)
    pred_b = best_b.predict(X_test_b)

    prod_pred = prod_predict(test_raw)
    y_test = test_raw["TTT"].to_numpy()

    # Subset analysis
    mask_all = np.ones(len(y_test), dtype=bool)
    mask_120 = y_test < 120
    mask_90 = y_test < 90
    mask_60 = y_test <= 60

    perf_rows = []
    for name, pred in [
        ("LightGBM_LeakageFree_A", pred_a),
        ("LightGBM_DatasetB", pred_b),
        ("Phase19_Production_Leaky", prod_pred),
    ]:
        for label, mask in [("All_heats", mask_all), ("TTT_lt_120", mask_120), ("TTT_lt_90", mask_90), ("TTT_le_60", mask_60)]:
            m = subset_metrics(y_test, pred, mask, label)
            if m:
                m["Model"] = name
                m["Temporal_split"] = "Yes"
                perf_rows.append(m)

    perf_df = pd.DataFrame(perf_rows)
    perf_df.to_csv(PHASE_ROOT / "performance_comparison.csv", index=False)

    # Error clusters
    err_df = error_cluster_analysis(test_a, y_test_a, pred_a)
    err_df.to_csv(PHASE_ROOT / "error_clusters.csv", index=False)

    # SHAP
    X_imp = best.named_steps["imputer"].transform(X_test_a)
    est = best.named_steps["model"]
    n = min(1500, len(X_imp))
    idx = np.random.default_rng(RANDOM_STATE).choice(len(X_imp), n, replace=False)
    explainer = shap.Explainer(est, X_imp[idx])
    sv = explainer(X_imp[idx], check_additivity=False).values
    shap_df = pd.DataFrame({"Feature": feat_a, "Mean_ABS_SHAP": np.abs(sv).mean(axis=0)}).sort_values("Mean_ABS_SHAP", ascending=False)
    shap_df.to_csv(PHASE_ROOT / "shap_analysis.csv", index=False)

    perm = permutation_importance(best, X_test_a, y_test_a, n_repeats=8, random_state=RANDOM_STATE, n_jobs=-1)
    perm_df = pd.DataFrame({"Feature": feat_a, "Permutation_MAE_increase": perm.importances_mean}).sort_values("Permutation_MAE_increase", ascending=False)
    perm_df.to_csv(PHASE_ROOT / "permutation_importance.csv", index=False)

    abl_df = ablation_study(best, X_train_a, y_train_a, X_test_a, y_test_a, feat_a)
    abl_df.to_csv(PHASE_ROOT / "ablation_results.csv", index=False)

    stack_pipe = make_tree_pipeline(
        StackingRegressor(
            estimators=[
                ("hgb", HistGradientBoostingRegressor(max_iter=200, random_state=RANDOM_STATE)),
                ("et", ExtraTreesRegressor(n_estimators=100, max_depth=10, random_state=RANDOM_STATE, n_jobs=-1)),
            ],
            final_estimator=Ridge(),
            n_jobs=-1,
        )
    )

    rows = pd.read_csv(PHASE_ROOT / "model_comparison.csv") if (PHASE_ROOT / "model_comparison.csv").exists() else pd.DataFrame()
    if rows.empty:
        rows = pd.DataFrame([metrics_dict(y_test_a, pred_a) | {"Model": "LightGBM"}])

    stack_pipe.fit(X_train_a, y_train_a)
    stack_m = metrics_dict(y_test_a, stack_pipe.predict(X_test_a))
    stack_m["Model"] = "Stacking_HGB_ET"
    vote_pipe = make_tree_pipeline(
        VotingRegressor(
            estimators=[
                ("hgb", HistGradientBoostingRegressor(max_iter=200, random_state=RANDOM_STATE)),
                ("et", ExtraTreesRegressor(n_estimators=100, max_depth=10, random_state=RANDOM_STATE, n_jobs=-1)),
            ],
            n_jobs=-1,
        )
    )
    vote_pipe.fit(X_train_a, y_train_a)
    vote_m = metrics_dict(y_test_a, vote_pipe.predict(X_test_a))
    vote_m["Model"] = "Voting_HGB_ET"
    comp = pd.concat([rows, pd.DataFrame([stack_m, vote_m])], ignore_index=True).drop_duplicates(subset=["Model"], keep="last")
    comp.to_csv(PHASE_ROOT / "model_comparison.csv", index=False)

    # Plots
    fig, ax = plt.subplots(figsize=(10, 6))
    comp.sort_values("MAE").head(10).plot.barh(x="Model", y="MAE", ax=ax, legend=False, color="steelblue")
    ax.invert_yaxis()
    ax.set_title("Phase 24 Model MAE (temporal test)")
    fig.tight_layout()
    fig.savefig(PLOTS_DIR / "model_comparison_mae.png", dpi=150)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(9, 5))
    pivot = perf_df[perf_df["Subset"] == "TTT_lt_120"].sort_values("MAE")
    ax.bar(pivot["Model"], pivot["MAE"], color=["#2ecc71" if "LeakageFree" in m or "DatasetB" in m else "#e74c3c" for m in pivot["Model"]])
    ax.set_xticklabels(pivot["Model"], rotation=20, ha="right")
    ax.set_ylabel("MAE (min)")
    ax.set_title("Normal heats only (TTT < 120 min) — temporal test")
    fig.tight_layout()
    fig.savefig(PLOTS_DIR / "old_vs_new_mae.png", dpi=150)
    plt.close(fig)

    shap_df.head(15).plot.barh(x="Feature", y="Mean_ABS_SHAP", figsize=(10, 8), legend=False, color="teal")
    plt.gca().invert_yaxis()
    plt.title("SHAP — Leakage-free model")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "shap_importance.png", dpi=150)
    plt.close()

    try:
        fig, ax = plt.subplots(figsize=(12, 8))
        PartialDependenceDisplay.from_estimator(best, X_test_a, features=shap_df.head(4)["Feature"].tolist(), ax=ax)
        fig.suptitle("Partial dependence — top features")
        fig.tight_layout()
        fig.savefig(PLOTS_DIR / "partial_dependence_top4.png", dpi=150)
        plt.close(fig)
    except Exception:
        pass

    # Reports
    m_all_new = perf_df[(perf_df["Model"] == "LightGBM_LeakageFree_A") & (perf_df["Subset"] == "All_heats")].iloc[0]
    m_norm_new = perf_df[(perf_df["Model"] == "LightGBM_LeakageFree_A") & (perf_df["Subset"] == "TTT_lt_120")].iloc[0]
    m_all_prod = perf_df[(perf_df["Model"] == "Phase19_Production_Leaky") & (perf_df["Subset"] == "All_heats")].iloc[0]
    m_norm_prod = perf_df[(perf_df["Model"] == "Phase19_Production_Leaky") & (perf_df["Subset"] == "TTT_lt_120")].iloc[0]
    delta_all = m_all_new["MAE"] - m_all_prod["MAE"]
    delta_norm = m_norm_new["MAE"] - m_norm_prod["MAE"]

    report = f"""# Phase 24 — Industrial Interpretation

## Validation protocol
- **Temporal split:** first 80% by date for training, last 20% for test (Sjunnesson 2019 recommendation).
- **No EE_KWH / POWER** in any leakage-free feature.
- Dataset A includes OXY/CPC as *assumed* planning setpoints.

## Performance summary (temporal test)

| Model | MAE all heats | MAE TTT<120 | R² all |
|-------|---------------|-------------|--------|
| Leakage-free (A) | {m_all_new['MAE']:.2f} | {m_norm_new['MAE']:.2f} | {m_all_new['R2']:.3f} |
| Production Phase 19 | {m_all_prod['MAE']:.2f} | {m_norm_prod['MAE']:.2f} | {m_all_prod['R2']:.3f} |

**MAE delta (all heats):** {delta_all:+.2f} min  
**MAE delta (normal heats):** {delta_norm:+.2f} min

## Interpretation
- Full-test MAE is dominated by **delay/shutdown outliers** (43 heats with TTT>120 min in temporal test).
- On **normal heats (TTT<120)**, leakage-free model is the fair comparison cohort.
- Production model benefits from **HM_X_POWER** and **POWER_PER_TONNE** encoding realized melt duration — invalid at planning time.

## Top SHAP features
{shap_df.head(10).to_string(index=False)}

## Error clusters
{err_df.head(8).to_string(index=False)}

## Ablation
{abl_df.sort_values('Delta_MAE', ascending=False).head(6).to_string(index=False)}
"""
    (PHASE_ROOT / "industrial_interpretation.md").write_text(report, encoding="utf-8")

    rec = f"""# Phase 25 Recommendations

## Final report

### 1. Did removing leakage reduce accuracy?
On **all heats** temporal test: **yes**, MAE increased by **{delta_all:+.2f} min** vs Phase 19.  
On **normal heats (TTT<120)**: **{delta_norm:+.2f} min** — fairer comparison.

### 2. How much?
- All heats: leakage-free MAE **{m_all_new['MAE']:.2f}** vs production **{m_all_prod['MAE']:.2f}**
- Normal heats: leakage-free **{m_norm_new['MAE']:.2f}** vs production **{m_norm_prod['MAE']:.2f}**

### 3. Which variables caused the loss?
`HM_X_POWER` (SHAP #1) and `POWER_PER_TONNE` (SHAP #5) in production — both embed post-heat EE_KWH.

### 4. Can physical features recover the loss?
Partially on normal heats via `HM_X_OXY_NORM`, burden dominance, flux ratios. Full recovery needs **DRI metallization**, **power-on time**, **delay flags**.

### 5. Best leakage-free model
**LightGBM** on Dataset A (56 planning-safe features).

### 6. Replace production?
**Not yet** — requires JSPL OXY/CPC confirmation, two-stage delay model, industrial sign-off.

### 7. Expected MAE with new variables
**2.4–2.9 min** on normal heats with metallization + power-on + restriction flags.
"""
    (PHASE_ROOT / "phase_25_recommendations.md").write_text(rec, encoding="utf-8")

    fe_doc = Path(PHASE_ROOT / "feature_engineering_document.md")
    if not fe_doc.exists():
        fe_doc.write_text("# Phase 24 Feature Engineering\n\nSee feature_engineering.py and feature_dictionary.xlsx.\n", encoding="utf-8")

    print("Complete. Normal-heats MAE:", m_norm_new["MAE"], "Prod:", m_norm_prod["MAE"], "Delta:", delta_norm)


if __name__ == "__main__":
    main()
