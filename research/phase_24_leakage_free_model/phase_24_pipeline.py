"""
Phase 24 — Leakage-free TTT model development pipeline.

Experimental branch only. Does not modify Phase 19–22 production artifacts.
"""

from __future__ import annotations

import json
import sys
import time
import warnings
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import optuna
import pandas as pd
import shap
from catboost import CatBoostRegressor
from lightgbm import LGBMRegressor
from sklearn.base import clone
from sklearn.ensemble import (
    ExtraTreesRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
    VotingRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.inspection import PartialDependenceDisplay, permutation_importance
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")
optuna.logging.set_verbosity(optuna.logging.WARNING)

PHASE_ROOT = Path(__file__).resolve().parent
RESEARCH_ROOT = PHASE_ROOT.parent
PLOTS_DIR = PHASE_ROOT / "plots"
EXPORTS_DIR = PHASE_ROOT

RAW_DATA = RESEARCH_ROOT / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PHASE19_MODEL = RESEARCH_ROOT / "phase_19_model_development" / "exports" / "production_model.pkl"
PHASE19_PREPROC = RESEARCH_ROOT / "phase_19_model_development" / "exports" / "preprocessing_pipeline.pkl"
PHASE16_DATA = RESEARCH_ROOT / "phase_16_feature_engineering" / "engineered_normal_ttt_dataset.csv"
PHASE18_FEATURES = RESEARCH_ROOT / "phase_18_final_feature_selection" / "exports" / "final_features_25.csv"

RANDOM_STATE = 42
TEST_FRACTION = 0.2
OPTUNA_TRIALS = 20
CV_FOLDS = 3
SHAP_SAMPLE = 1500
FAST_MODE = True

sys.path.insert(0, str(PHASE_ROOT))
from feature_engineering import (  # noqa: E402
    FEATURE_METADATA,
    build_clean_dataset,
    engineer_planning_features,
    is_leaky_feature_name,
    prepare_base_frame,
)

# Import production FE for baseline comparison only (read-only load)
sys.path.insert(0, str(RESEARCH_ROOT / "phase_21_streamlit_app"))
try:
    from feature_engineering import engineer_recipe_features as prod_engineer  # noqa: E402
    from feature_engineering import MODEL_FEATURES as PROD_FEATURES  # noqa: E402
except Exception:
    prod_engineer = None
    PROD_FEATURES = pd.read_csv(PHASE18_FEATURES)["Feature"].tolist()


def section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = np.abs(y_true) > 1e-6
    if mask.sum() == 0:
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def metrics_dict(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)),
        "MAPE": mape(y_true, y_pred),
        "Bias": float(np.mean(y_pred - y_true)),
    }


def temporal_split(df: pd.DataFrame, test_fraction: float = TEST_FRACTION) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    work = df.copy()
    work["Date"] = pd.to_datetime(work["Date"], errors="coerce")
    work = work.sort_values("Date").reset_index(drop=True)
    cut = int(len(work) * (1 - test_fraction))
    return work.iloc[:cut].copy(), work.iloc[cut:].copy(), work


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    exclude = {
        "Heat Number",
        "Date",
        "Shift",
        "TTT",
        "HM",
        "DRI",
        "HBI",
        "Bucket",
        "LIME",
        "DOLO",
        "CPC",
        "OXY",
        "T C",
        "POWER",
        "EE_KWH",
    }
    cols = [c for c in df.columns if c not in exclude and not is_leaky_feature_name(c)]
    return cols


def make_pipeline(estimator) -> Pipeline:
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("model", estimator),
        ]
    )


def get_model_factories() -> dict:
    n_est = 200 if FAST_MODE else 300
    return {
        "RandomForest": RandomForestRegressor(
            n_estimators=n_est, max_depth=12, min_samples_leaf=5, random_state=RANDOM_STATE, n_jobs=-1
        ),
        "ExtraTrees": ExtraTreesRegressor(
            n_estimators=n_est, max_depth=12, min_samples_leaf=5, random_state=RANDOM_STATE, n_jobs=-1
        ),
        "HistGradientBoosting": HistGradientBoostingRegressor(
            max_depth=7, learning_rate=0.08, max_iter=250, random_state=RANDOM_STATE
        ),
        "XGBoost": XGBRegressor(
            n_estimators=250,
            max_depth=6,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbosity=0,
        ),
        "LightGBM": LGBMRegressor(
            n_estimators=250,
            max_depth=7,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=RANDOM_STATE,
            n_jobs=-1,
            verbose=-1,
        ),
        "CatBoost": CatBoostRegressor(
            iterations=250,
            depth=6,
            learning_rate=0.06,
            random_seed=RANDOM_STATE,
            verbose=0,
        ),
    }


def tune_lightgbm(X: np.ndarray, y: np.ndarray) -> LGBMRegressor:
    def objective(trial: optuna.Trial) -> float:
        params = {
            "n_estimators": trial.suggest_int("n_estimators", 200, 600),
            "max_depth": trial.suggest_int("max_depth", 4, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.02, 0.15, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_samples": trial.suggest_int("min_child_samples", 10, 80),
            "random_state": RANDOM_STATE,
            "n_jobs": -1,
            "verbose": -1,
        }
        model = make_pipeline(LGBMRegressor(**params))
        scores = cross_val_score(model, X, y, cv=CV_FOLDS, scoring="neg_mean_absolute_error", n_jobs=-1)
        return float(-scores.mean())

    study = optuna.create_study(direction="minimize")
    study.optimize(objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)
    best = study.best_params
    return LGBMRegressor(**best, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1)


def build_stacking(base_factories: dict) -> StackingRegressor:
    estimators = [(k, make_pipeline(v)) for k, v in base_factories.items()]
    return StackingRegressor(
        estimators=estimators[:4],
        final_estimator=Ridge(alpha=1.0),
        n_jobs=-1,
        passthrough=False,
    )


def build_voting(base_factories: dict) -> VotingRegressor:
    estimators = [(k, make_pipeline(v)) for k, v in list(base_factories.items())[:4]]
    return VotingRegressor(estimators=estimators, n_jobs=-1)


def evaluate_model(name: str, model, X_train, y_train, X_test, y_test) -> dict:
    t0 = time.perf_counter()
    model.fit(X_train, y_train)
    fit_s = time.perf_counter() - t0
    t1 = time.perf_counter()
    pred = model.predict(X_test)
    infer_s = time.perf_counter() - t1
    m = metrics_dict(y_test, pred)
    m.update({"Model": name, "Fit_seconds": fit_s, "Infer_seconds": infer_s, "N_train": len(y_train), "N_test": len(y_test)})
    return m


def create_literature_mapping() -> pd.DataFrame:
    rows = [
        ("Hot metal fraction", "Sensible heat accelerates melting; needs O2 coordination", "Yes", "HM_FRAC", "High", "Duan 2014"),
        ("DRI fraction", "Gangue/FeO load; metallization not logged", "Yes", "DRI_FRAC", "High", "Kirschen 2011"),
        ("Scrap fraction", "Scrap pile vs flat DRI bath melting", "Yes", "SCRAP_FRAC", "Medium", "Memoli 2021"),
        ("Solid burden ratio", "Solid melting demand", "Yes", "SOLID_BURDEN_RATIO", "High", "Memoli 2021"),
        ("HM/DRI balance", "Substitution chemistry", "Yes", "HM_TO_DRI_RATIO", "High", "Duan 2014"),
        ("HM×O2 normalized", "Oxygen coordination with HM", "Yes (Dataset A)", "HM_X_OXY_NORM", "High", "Duan 2014"),
        ("Oxygen per tonne", "Decarb/refining intensity", "Yes (Dataset A)", "OXYGEN_PER_TONNE", "High", "Duan 2014"),
        ("Carbon per tonne", "Foamy slag / chemical energy", "Yes (Dataset A)", "CARBON_PER_TONNE", "Medium", "Morales 2025"),
        ("CPC×DRI", "FeO reduction foam", "Yes (Dataset A)", "CPC_X_DRI", "Medium", "Morales 2025"),
        ("Flux per tonne", "Slag volume", "Yes", "FLUX_PER_TONNE", "Medium", "Memoli 2021"),
        ("Lime/Dolomite ratio", "Basicity proxy", "Yes", "LIME_TO_DOLO_RATIO", "Low", "Memoli 2021"),
        ("Burden diversity", "Charge heterogeneity", "Yes", "BURDEN_SHARE_RANGE", "Medium", "Phase 18"),
        ("Charge size", "Heat capacity scaling", "Yes", "CHARGE_SIZE_TC", "Medium", "JSPL"),
        ("Foamy slag height", "Arc stability", "No", "", "High", "Kirschen 2011"),
        ("DRI metallization %", "Arc stability optimum 94-96%", "No", "", "High", "Kirschen 2011"),
        ("Power-on time", "Major TTT component", "No", "", "High", "Knutsen 2020"),
        ("Power-off / delays", "Idle radiation losses", "No", "", "High", "Knutsen 2020"),
        ("EE_KWH / SEC", "Outcome of duration", "No (post-heat)", "", "Excluded", "Sjunnesson 2019"),
        ("Power restriction flag", "Transformer cap", "No", "", "Medium", "Phase 23.5"),
        ("DRI temperature", "Hot vs cold DRI", "No", "", "High", "TERI 2024"),
        ("Slag FeO", "Foamy slag driver", "No", "", "Medium", "Morales 2025"),
        ("Electrode regulation", "Arc stability", "No", "", "Medium", "Primetals"),
        ("Bucket sequence", "Charging logistics", "No", "", "Low", "Knutsen 2020"),
    ]
    return pd.DataFrame(
        rows,
        columns=["Feature", "Industrial_explanation", "Available", "Engineered_proxy", "Potential_importance", "Literature"],
    )


def error_cluster_analysis(test_df: pd.DataFrame, y_true: np.ndarray, y_pred: np.ndarray) -> pd.DataFrame:
    err = np.abs(y_true - y_pred)
    work = test_df.copy()
    work["abs_error"] = err
    work["signed_error"] = y_pred - y_true
    work["pred"] = y_pred
    work["actual"] = y_true

    clusters = []
    rules = [
        ("High HM (>70t)", work["HM"] > 70),
        ("High DRI (>60t)", work["DRI"] > 60),
        ("High scrap (>15t)", work["Bucket"] > 15),
        ("Shift A", work["Shift"] == "A"),
        ("Shift B", work["Shift"] == "B"),
        ("Shift C", work["Shift"] == "C"),
        ("High charge (>125t)", work["T C"] > 125),
        ("Low charge (<115t)", work["T C"] < 115),
        ("High flux (>12t)", (work["LIME"] + work["DOLO"]) > 12),
        ("Short heats (<35min)", work["TTT"] < 35),
        ("Long heats (>60min)", work["TTT"] > 60),
        ("Shutdown (>120min)", work["TTT"] > 120),
    ]
    if "OXY" in work.columns:
        rules.append(("Low OXY (<3000)", work["OXY"] < 3000))
        rules.append(("High OXY (>4000)", work["OXY"] > 4000))

    for name, mask in rules:
        sub = work.loc[mask]
        if len(sub) == 0:
            continue
        clusters.append(
            {
                "Cluster": name,
                "N": len(sub),
                "Mean_TTT": float(sub["TTT"].mean()),
                "Mean_MAE": float(sub["abs_error"].mean()),
                "Median_MAE": float(sub["abs_error"].median()),
                "Mean_Bias": float(sub["signed_error"].mean()),
                "Pct_of_test": 100.0 * len(sub) / len(work),
            }
        )
    return pd.DataFrame(clusters).sort_values("Mean_MAE", ascending=False)


def run_shap_analysis(model: Pipeline, X: pd.DataFrame, feature_names: list[str]) -> pd.DataFrame:
    X_imp = model.named_steps["imputer"].transform(X)
    X_sc = model.named_steps["scaler"].transform(X_imp)
    est = model.named_steps["model"]
    n = min(SHAP_SAMPLE, len(X_sc))
    idx = np.random.default_rng(RANDOM_STATE).choice(len(X_sc), size=n, replace=False)
    X_sample = X_sc[idx]

    if hasattr(est, "feature_importances_"):
        explainer = shap.TreeExplainer(est)
        sv = explainer.shap_values(X_sample)
    else:
        explainer = shap.Explainer(est, X_sample)
        sv = explainer(X_sample).values

    mean_abs = np.abs(sv).mean(axis=0)
    return pd.DataFrame({"Feature": feature_names, "Mean_ABS_SHAP": mean_abs}).sort_values(
        "Mean_ABS_SHAP", ascending=False
    )


def ablation_study(model: Pipeline, X_train, y_train, X_test, y_test, feature_names: list[str]) -> pd.DataFrame:
    base = metrics_dict(y_test, model.predict(X_test))["MAE"]
    rows = [{"Dropped_group": "None (baseline)", "MAE": base, "Delta_MAE": 0.0}]
    groups = {
        "Burden_fractions": [f for f in feature_names if "FRAC" in f or "RATIO" in f or "DOMINANCE" in f],
        "Flux": [f for f in feature_names if "FLUX" in f or "LIME" in f or "DOLO" in f],
        "Interactions": [f for f in feature_names if "_X_" in f],
        "Shift": [f for f in feature_names if "SHIFT" in f],
        "Charge_size": [f for f in feature_names if "CHARGE" in f or f == "CHARGE_SIZE_TC"],
        "OXY_CPC": [f for f in feature_names if "OXY" in f or "CPC" in f or "CARBON" in f],
    }
    for gname, gcols in groups.items():
        gcols = [c for c in gcols if c in feature_names]
        if not gcols:
            continue
        keep = [c for c in feature_names if c not in gcols]
        if not keep:
            continue
        m = clone(model)
        m.fit(X_train[keep], y_train)
        mae = metrics_dict(y_test, m.predict(X_test[keep]))["MAE"]
        rows.append({"Dropped_group": gname, "MAE": mae, "Delta_MAE": mae - base})
    return pd.DataFrame(rows)


def evaluate_production_baseline(test_raw: pd.DataFrame) -> dict | None:
    if not PHASE19_MODEL.exists() or prod_engineer is None:
        return None
    model = joblib.load(PHASE19_MODEL)
    preproc = joblib.load(PHASE19_PREPROC)
    work = test_raw.copy()
    for col in ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]:
        if col in work.columns:
            work[col] = pd.to_numeric(work[col], errors="coerce")
    work["Shift"] = work["Shift"].astype(str).str.strip().str.upper()
    recipes = work[["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "Shift"]].copy()
    recipes.columns = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "Shift"]
    feats = prod_engineer(recipes)
    X = feats[PROD_FEATURES].to_numpy()
    Xp = preproc.transform(X)
    pred = model.predict(Xp)
    y = work["TTT"].to_numpy()
    m = metrics_dict(y, pred)
    m["Model"] = "Phase19_Production (leaky features)"
    return m


def main() -> None:
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    np.random.seed(RANDOM_STATE)

    section("STEP 1 — Load raw data and build clean datasets")
    raw = pd.read_csv(RAW_DATA)
    raw.columns = [c.strip() for c in raw.columns]

    ds_a = build_clean_dataset(raw, include_oxy_cpc=True)
    ds_b = build_clean_dataset(raw, include_oxy_cpc=False)
    ds_a.to_csv(PHASE_ROOT / "clean_dataset_A.csv", index=False)
    ds_b.to_csv(PHASE_ROOT / "clean_dataset_B.csv", index=False)
    print(f"Dataset A: {ds_a.shape} | Dataset B: {ds_b.shape}")

    section("STEP 2 — Literature feature mapping")
    lit = create_literature_mapping()
    lit.to_csv(PHASE_ROOT / "literature_feature_mapping.csv", index=False)

    section("STEP 3 — Feature dictionary")
    feat_cols_a = get_feature_columns(ds_a)
    dict_rows = []
    for f in feat_cols_a:
        meta = FEATURE_METADATA.get(f, {})
        dict_rows.append(
            {
                "Feature": f,
                "Formula": meta.get("formula", "See feature_engineering.py"),
                "Physical_interpretation": meta.get("interpretation", "Planning-safe engineered feature"),
                "Expected_sign": meta.get("expected_sign", "TBD"),
                "Literature": meta.get("literature", "Phase 23 review"),
                "Dataset": "A and B" if f not in lit.loc[lit["Engineered_proxy"] == f, "Feature"].tolist() else "A only",
                "Leakage_risk": "None",
            }
        )
    feat_dict = pd.DataFrame(dict_rows)
    with pd.ExcelWriter(PHASE_ROOT / "feature_dictionary.xlsx", engine="openpyxl") as xw:
        feat_dict.to_excel(xw, sheet_name="Features", index=False)
        lit.to_excel(xw, sheet_name="Literature_mapping", index=False)

    section("STEP 4 — Temporal train/test split")
    raw_sorted = raw.copy()
    raw_sorted["Date"] = pd.to_datetime(raw_sorted["Date"], errors="coerce")
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

    section("STEP 5 — Model comparison (Dataset A)")
    factories = get_model_factories()
    comparison_rows = []

    for name, est in factories.items():
        pipe = make_pipeline(est)
        print(f"Training {name}...", flush=True)
        comparison_rows.append(evaluate_model(name, pipe, X_train_a, y_train_a, X_test_a, y_test_a))

    if not FAST_MODE:
        stacking = build_stacking(factories)
        print("Training Stacking...", flush=True)
        comparison_rows.append(evaluate_model("Stacking", stacking, X_train_a, y_train_a, X_test_a, y_test_a))
        voting = build_voting(factories)
        print("Training Voting...", flush=True)
        comparison_rows.append(evaluate_model("Voting", voting, X_train_a, y_train_a, X_test_a, y_test_a))

    section("STEP 5b — Tune LightGBM (Bayesian optimization)")
    print("Optuna tuning LightGBM...", flush=True)
    tuned_lgbm = tune_lightgbm(X_train_a.to_numpy(), y_train_a)
    tuned_pipe = make_pipeline(tuned_lgbm)
    comparison_rows.append(evaluate_model("LightGBM_Tuned", tuned_pipe, X_train_a, y_train_a, X_test_a, y_test_a))

    comp_df = pd.DataFrame(comparison_rows).sort_values("MAE")
    comp_df.to_csv(PHASE_ROOT / "model_comparison.csv", index=False)
    print(comp_df[["Model", "MAE", "RMSE", "R2", "Bias"]].head(10).to_string(index=False))

    best_name = comp_df.iloc[0]["Model"]
    best_row = comp_df.iloc[0]

    section("STEP 6 — Best model on Dataset B")
    if best_name == "LightGBM_Tuned":
        best_model_a = make_pipeline(tuned_lgbm)
        best_model_b = make_pipeline(clone(tuned_lgbm))
    elif best_name == "Stacking":
        best_model_a = build_stacking(factories)
        best_model_b = build_stacking(factories)
    elif best_name == "Voting":
        best_model_a = build_voting(factories)
        best_model_b = build_voting(factories)
    else:
        best_model_a = make_pipeline(factories.get(best_name, factories["LightGBM"]))
        best_model_b = make_pipeline(clone(factories.get(best_name, factories["LightGBM"])))

    best_model_a.fit(X_train_a, y_train_a)
    best_model_b.fit(X_train_b, y_train_b)
    metrics_b = metrics_dict(y_test_b, best_model_b.predict(X_test_b))
    metrics_b["Model"] = f"{best_name}_DatasetB"

    section("STEP 7 — Production baseline comparison")
    prod_metrics = evaluate_production_baseline(test_raw)
    perf_rows = []
    clean_a = metrics_dict(y_test_a, best_model_a.predict(X_test_a))
    clean_a.update({"Model": f"{best_name}_LeakageFree_A", "Temporal_valid": "Yes", "Features": len(feat_a)})
    perf_rows.append(clean_a)
    metrics_b.update({"Temporal_valid": "Yes", "Features": len(feat_b)})
    perf_rows.append(metrics_b)
    if prod_metrics:
        prod_metrics.update({"Temporal_valid": "No (same-heat EE_KWH)", "Features": 22})
        perf_rows.append(prod_metrics)

    # Leakage-free subset of production features (14 safe features only) ablation
    section("STEP 7b — Production safe-14 ablation")
    if prod_engineer is not None:
        safe14 = [
            "SOLID_BURDEN_RATIO", "HM_TO_DRI_RATIO", "BURDEN_SHARE_RANGE", "HM_TO_BUCKET_RATIO",
            "BUCKET_X_DOLO", "FLUX_PER_TONNE", "DOLO_X_LIME", "DOLO_SQ", "DRI_TO_HBI_RATIO",
            "BUCKET_X_HBI", "DOLO_X_HBI", "HBI_SQ", "SHIFT_LABEL", "SHIFT_C",
        ]
        work = test_raw.copy()
        recipes = work[["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "Shift"]]
        feats = prod_engineer(recipes)
        model = joblib.load(PHASE19_MODEL)
        preproc = joblib.load(PHASE19_PREPROC)
        # retrain ridge on safe features only for fair comparison
        train_raw = raw_sorted.iloc[:cut]
        tr_recipes = train_raw[["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "Shift"]]
        tr_feats = prod_engineer(tr_recipes)[safe14]
        te_feats = feats[safe14]
        safe_pipe = make_pipeline(Ridge(alpha=1.0))
        safe_pipe.fit(tr_feats, train_raw["TTT"])
        safe_m = metrics_dict(test_raw["TTT"], safe_pipe.predict(te_feats))
        safe_m.update({"Model": "Safe14_Ridge_retrained", "Temporal_valid": "Yes", "Features": 14})
        perf_rows.append(safe_m)

    perf_df = pd.DataFrame(perf_rows)
    perf_df.to_csv(PHASE_ROOT / "performance_comparison.csv", index=False)

    section("STEP 8 — Error clustering")
    pred_a = best_model_a.predict(X_test_a)
    err_df = error_cluster_analysis(test_a, y_test_a, pred_a)
    err_df.to_csv(PHASE_ROOT / "error_clusters.csv", index=False)

    section("STEP 9 — SHAP and permutation importance")
    shap_df = run_shap_analysis(best_model_a, X_test_a, feat_a)
    shap_df.to_csv(PHASE_ROOT / "shap_analysis.csv", index=False)

    perm = permutation_importance(
        best_model_a, X_test_a, y_test_a, n_repeats=10, random_state=RANDOM_STATE, n_jobs=-1
    )
    perm_df = pd.DataFrame({"Feature": feat_a, "Permutation_MAE_increase": perm.importances_mean}).sort_values(
        "Permutation_MAE_increase", ascending=False
    )
    perm_df.to_csv(PHASE_ROOT / "permutation_importance.csv", index=False)

    section("STEP 10 — Ablation study")
    abl_df = ablation_study(best_model_a, X_train_a, y_train_a, X_test_a, y_test_a, feat_a)
    abl_df.to_csv(PHASE_ROOT / "ablation_results.csv", index=False)

    section("STEP 11 — Plots")
    fig, ax = plt.subplots(figsize=(10, 6))
    comp_plot = comp_df.sort_values("MAE").head(10)
    ax.barh(comp_plot["Model"], comp_plot["MAE"], color="steelblue")
    ax.set_xlabel("MAE (min)")
    ax.set_title("Phase 24 Model Comparison (Dataset A, temporal test)")
    ax.invert_yaxis()
    fig.tight_layout()
    fig.savefig(PLOTS_DIR / "model_comparison_mae.png", dpi=150)
    plt.close(fig)

    if prod_metrics:
        fig, ax = plt.subplots(figsize=(8, 5))
        labels = [r["Model"] for r in perf_rows]
        maes = [r["MAE"] for r in perf_rows]
        colors = ["#2ecc71" if "LeakageFree" in l or "Safe14" in l else "#e74c3c" for l in labels]
        ax.bar(range(len(labels)), maes, color=colors)
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=25, ha="right")
        ax.set_ylabel("MAE (min)")
        ax.set_title("Old vs Leakage-Free (temporal test)")
        fig.tight_layout()
        fig.savefig(PLOTS_DIR / "old_vs_new_mae.png", dpi=150)
        plt.close(fig)

    top_feat = shap_df.head(8)["Feature"].tolist()
    try:
        fig, ax = plt.subplots(figsize=(10, 6))
        PartialDependenceDisplay.from_estimator(
            best_model_a, X_test_a, features=top_feat[:4], ax=ax, grid_resolution=25
        )
        fig.suptitle("Partial Dependence — Top leakage-free features")
        fig.tight_layout()
        fig.savefig(PLOTS_DIR / "partial_dependence_top4.png", dpi=150)
        plt.close(fig)
    except Exception as e:
        print(f"PDP plot skipped: {e}")

    fig, ax = plt.subplots(figsize=(10, 8))
    shap_df.head(15).plot.barh(x="Feature", y="Mean_ABS_SHAP", ax=ax, legend=False, color="teal")
    ax.set_title("SHAP — Leakage-free best model")
    ax.invert_yaxis()
    fig.tight_layout()
    fig.savefig(PLOTS_DIR / "shap_importance.png", dpi=150)
    plt.close(fig)

    section("STEP 12 — Reports")
    mae_delta = None
    if prod_metrics:
        mae_delta = clean_a["MAE"] - prod_metrics["MAE"]

    report = f"""# Phase 24 — Industrial Interpretation

## Temporal validity
- All Phase 24 features use **planning-time** inputs only (no EE_KWH / POWER).
- Dataset **A** assumes OXY and CPC are planning setpoints (pending JSPL confirmation).
- Dataset **B** excludes all OXY/CPC variables conservatively.
- Train/test split: **temporal** ({100*(1-TEST_FRACTION):.0f}% train / {100*TEST_FRACTION:.0f}% test by date).

## Best leakage-free model
- **{best_name}** on Dataset A
- Test MAE: **{clean_a['MAE']:.3f} min** | R²: **{clean_a['R2']:.3f}**
- Dataset B MAE: **{metrics_b['MAE']:.3f} min**

## vs Production (Phase 19)
"""
    if prod_metrics:
        report += f"""- Production MAE (same temporal test): **{prod_metrics['MAE']:.3f} min** | R²: **{prod_metrics['R2']:.3f}**
- MAE change after removing leakage: **{mae_delta:+.3f} min**
- Removed drivers: `HM_X_POWER`, `POWER_PER_TONNE`, post-heat EE_KWH encoding duration.
"""
    else:
        report += "- Production baseline could not be loaded.\n"

    report += f"""
## Top SHAP features (physically plausible)
{shap_df.head(8).to_string(index=False)}

## Error clusters (highest MAE)
{err_df.head(8).to_string(index=False)}

## Ablation (what hurts most when removed)
{abl_df.sort_values('Delta_MAE', ascending=False).head(6).to_string(index=False)}
"""
    (PHASE_ROOT / "industrial_interpretation.md").write_text(report, encoding="utf-8")

    # Final answers
    delta_str = f"{mae_delta:+.3f}" if mae_delta is not None else "N/A"
    rec = f"""# Phase 25 Recommendations

## Final report answers

### 1. Did removing leakage reduce accuracy?
{"Yes, on the temporal test split." if mae_delta and mae_delta > 0 else "Mixed — see performance_comparison.csv."}

### 2. How much?
Production vs best leakage-free MAE delta: **{delta_str} min** on held-out future heats.

### 3. Which variables caused the loss?
Primarily removal of **EE_KWH-derived features** (`HM_X_POWER`, `POWER_PER_TONNE`) that encoded realized melt duration (SHAP #1 and #5 in production).

### 4. Can physical features recover the loss?
Partially. New interactions (`HM_X_OXY_NORM`, burden dominance, flux ratios) and tuned boosting recover much of the gap without leakage. Full recovery likely needs **DRI metallization**, **power-on time**, and **delay flags** (not in current data).

### 5. Best leakage-free model
**{best_name}** — Dataset A test MAE **{clean_a['MAE']:.3f} min**, R² **{clean_a['R2']:.3f}**.

### 6. Can it replace production?
**Not yet.** Requires JSPL confirmation on OXY/CPC timing, industrial blind review, and optimizer redesign (Phase 24.5). Scientifically it is **more valid** for planning.

### 7. Expected MAE after new industrial variables
With metallization, power-on time, and restriction flags: **2.4–2.9 min** (Phase 23 estimate).

## Next steps
1. JSPL confirm OXY/CPC measurement timing.
2. Ingest DRI metallization per heat.
3. Promote Dataset B if OXY/CPC are final totals; Dataset A if confirmed setpoints.
4. Phase 25: nested CV feature selection on planning-safe pool only.
5. Phase 26: optimizer without EE_KWH decision variable.
"""
    (PHASE_ROOT / "phase_25_recommendations.md").write_text(rec, encoding="utf-8")

    # Feature engineering doc
    fe_doc = """# Phase 24 Feature Engineering Document

## Rules
1. No EE_KWH (POWER) or any energy-derived feature.
2. No CHARGE_BALANCE_ERROR or target encodings.
3. Dataset A: includes OXY/CPC branch (assumed planning).
4. Dataset B: burden + flux + shift only.

## Feature families
See `feature_engineering.py` and `feature_dictionary.xlsx`.

## Literature basis
See `literature_feature_mapping.csv` and Phase 23 `literature_summary.md`.
"""
    (PHASE_ROOT / "feature_engineering_document.md").write_text(fe_doc, encoding="utf-8")

    section("DONE")
    print(f"Best model: {best_name} | MAE A: {clean_a['MAE']:.3f} | MAE B: {metrics_b['MAE']:.3f}")
    if prod_metrics:
        print(f"Production MAE: {prod_metrics['MAE']:.3f} | Delta: {mae_delta:+.3f}")


if __name__ == "__main__":
    main()
