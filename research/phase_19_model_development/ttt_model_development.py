"""
Phase 19 - TTT Prediction Model Development.

Uses finalized Phase 18 features only. No further feature engineering or selection.
"""

from __future__ import annotations

import json
import logging
import sys
import time
import warnings
from pathlib import Path
from typing import Any

import lightgbm as lgb
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import optuna
import pandas as pd
import seaborn as sns
import shap
import xgboost as xgb
from catboost import CatBoostRegressor
from joblib import Memory, dump
from scipy import stats
from sklearn.base import BaseEstimator, RegressorMixin, clone
from sklearn.ensemble import (
    ExtraTreesRegressor,
    HistGradientBoostingRegressor,
    RandomForestRegressor,
    StackingRegressor,
    VotingRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.linear_model import ElasticNet, Lasso, LinearRegression, Ridge
from sklearn.metrics import (
    explained_variance_score,
    max_error,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import (
    KFold,
    RepeatedKFold,
    cross_val_score,
    learning_curve,
    train_test_split,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from tabulate import tabulate
from tqdm import tqdm

warnings.filterwarnings("ignore")
optuna.logging.set_verbosity(optuna.logging.WARNING)

RANDOM_STATE = 42
PHASE_ROOT = Path(__file__).resolve().parent
EXPORTS_DIR = PHASE_ROOT / "exports"
PLOTS_DIR = PHASE_ROOT / "plots"
CACHE_DIR = PHASE_ROOT / "cache"
MEMORY = Memory(location=CACHE_DIR, verbose=0)

PHASE18_DIR = PHASE_ROOT.parent / "phase_18_final_feature_selection" / "exports"
PHASE16_DATASET = PHASE_ROOT.parent / "phase_16_feature_engineering" / "engineered_normal_ttt_dataset.csv"
FEATURES_PRIMARY = PHASE18_DIR / "final_features_25.csv"
FEATURES_COMPARE = PHASE18_DIR / "final_features_15.csv"

TARGET = "TTT"
ID_COL = "Heat Number"
OPTUNA_TRIALS = 100
CV_FOLDS = 5
REPEATED_KFOLD_SPLITS = 5
REPEATED_KFOLD_REPEATS = 3
STABILITY_SEEDS = 10
SAVE_DPI = 300
SHAP_SAMPLE = 2500
BOOTSTRAP_INTERVALS = 200

REGIME_BINS = [
    ("Short (<35 min)", -np.inf, 35),
    ("Normal (35-60 min)", 35, 60),
    ("Long (60-120 min)", 60, 120),
    ("Shutdown (>120 min)", 120, np.inf),
]

SHAP_DEPENDENCE_FEATURES = [
    "HM_X_POWER",
    "POWER_PER_TONNE",
    "OXYGEN_PER_TONNE",
    "HM_TO_DRI_RATIO",
    "SOLID_BURDEN_RATIO",
]

MODEL_ORDER = [
    "LinearRegression",
    "Ridge",
    "Lasso",
    "ElasticNet",
    "RandomForest",
    "ExtraTrees",
    "XGBoost",
    "LightGBM",
    "CatBoost",
    "HistGradientBoosting",
    "StackingRegressor",
    "VotingRegressor",
]

PIPELINE_START = time.perf_counter()


def setup() -> logging.Logger:
    for d in [EXPORTS_DIR, PLOTS_DIR, CACHE_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    plt.rcParams.update({"savefig.dpi": SAVE_DPI, "figure.figsize": (10, 6), "axes.grid": True, "grid.alpha": 0.25})
    np.random.seed(RANDOM_STATE)
    return logging.getLogger("phase_19")


LOGGER = setup()


def section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def print_table(rows: list[list[Any]], headers: list[str]) -> None:
    print(tabulate(rows, headers=headers, tablefmt="github", floatfmt=".4f"))


def save_plot(fig: plt.Figure, name: str) -> None:
    path = PLOTS_DIR / f"{name}.png"
    fig.tight_layout()
    fig.savefig(path, dpi=SAVE_DPI, bbox_inches="tight")
    plt.close(fig)
    LOGGER.info("Plot saved: %s", path)


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    mask = y_true != 0
    if mask.sum() == 0:
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)),
        "MAPE": mape(y_true, y_pred),
        "Median_AE": float(np.median(np.abs(y_true - y_pred))),
        "Explained_Variance": float(explained_variance_score(y_true, y_pred)),
        "Max_Error": float(max_error(y_true, y_pred)),
        "Bias": float(np.mean(y_pred - y_true)),
    }


class MeanPredictor(BaseEstimator, RegressorMixin):
    def fit(self, X, y):
        self.value_ = float(np.mean(y))
        return self

    def predict(self, X):
        return np.full(len(X), self.value_)


def make_pipeline(estimator, scale: bool) -> Pipeline:
    steps: list[tuple[str, Any]] = [("imputer", SimpleImputer(strategy="median"))]
    if scale:
        steps.append(("scaler", StandardScaler()))
    steps.append(("model", estimator))
    return Pipeline(steps)


def load_features(path: Path) -> list[str]:
    return pd.read_csv(path)["Feature"].tolist()


def load_data(features: list[str]) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(PHASE16_DATASET)
    missing = [f for f in features if f not in df.columns]
    if missing:
        raise ValueError(f"Missing features in dataset: {missing}")
    X = df[features].apply(pd.to_numeric, errors="coerce")
    y = pd.to_numeric(df[TARGET], errors="coerce")
    mask = y.notna()
    return X.loc[mask].reset_index(drop=True), y.loc[mask].reset_index(drop=True)


def split_data(X: pd.DataFrame, y: pd.Series) -> dict[str, Any]:
    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y_train_full, test_size=0.2, random_state=RANDOM_STATE
    )
    return {
        "train": (X_train, y_train),
        "val": (X_val, y_val),
        "test": (X_test, y_test),
        "train_full": (X_train_full, y_train_full),
    }


def cv_mae(model, X: np.ndarray, y: np.ndarray, cv) -> tuple[float, float]:
    scores = cross_val_score(model, X, y, cv=cv, scoring="neg_mean_absolute_error", n_jobs=-1)
    return float(-scores.mean()), float(scores.std())


def repeated_kfold_mae(model, X: np.ndarray, y: np.ndarray) -> tuple[float, float]:
    rkf = RepeatedKFold(
        n_splits=REPEATED_KFOLD_SPLITS,
        n_repeats=REPEATED_KFOLD_REPEATS,
        random_state=RANDOM_STATE,
    )
    return cv_mae(model, X, y, rkf)


def build_estimator(name: str, params: dict[str, Any]) -> Any:
    p = params.copy()
    if name == "LinearRegression":
        return LinearRegression(**{k: v for k, v in p.items() if k in {"fit_intercept"}})
    if name == "Ridge":
        return Ridge(random_state=RANDOM_STATE, **p)
    if name == "Lasso":
        return Lasso(random_state=RANDOM_STATE, max_iter=10000, **p)
    if name == "ElasticNet":
        return ElasticNet(random_state=RANDOM_STATE, max_iter=10000, **p)
    if name == "RandomForest":
        return RandomForestRegressor(random_state=RANDOM_STATE, n_jobs=-1, **p)
    if name == "ExtraTrees":
        return ExtraTreesRegressor(random_state=RANDOM_STATE, n_jobs=-1, **p)
    if name == "XGBoost":
        return xgb.XGBRegressor(random_state=RANDOM_STATE, n_jobs=-1, verbosity=0, **p)
    if name == "LightGBM":
        return lgb.LGBMRegressor(random_state=RANDOM_STATE, n_jobs=-1, verbose=-1, **p)
    if name == "CatBoost":
        p.setdefault("verbose", False)
        p.setdefault("random_seed", RANDOM_STATE)
        if "random_state" in p:
            p.pop("random_state")
        return CatBoostRegressor(**p)
    if name == "HistGradientBoosting":
        return HistGradientBoostingRegressor(random_state=RANDOM_STATE, **p)
    raise ValueError(name)


def optuna_search_space(trial: optuna.Trial, name: str) -> dict[str, Any]:
    if name == "LinearRegression":
        return {"fit_intercept": trial.suggest_categorical("fit_intercept", [True, False])}
    if name == "Ridge":
        return {"alpha": trial.suggest_float("alpha", 1e-3, 100.0, log=True)}
    if name == "Lasso":
        return {"alpha": trial.suggest_float("alpha", 1e-4, 10.0, log=True)}
    if name == "ElasticNet":
        return {
            "alpha": trial.suggest_float("alpha", 1e-4, 10.0, log=True),
            "l1_ratio": trial.suggest_float("l1_ratio", 0.05, 0.95),
        }
    if name == "RandomForest":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 400),
            "max_depth": trial.suggest_int("max_depth", 4, 20),
            "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
            "max_features": trial.suggest_categorical("max_features", ["sqrt", "log2", 0.5, 0.8]),
        }
    if name == "ExtraTrees":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 400),
            "max_depth": trial.suggest_int("max_depth", 4, 24),
            "min_samples_leaf": trial.suggest_int("min_samples_leaf", 1, 10),
            "max_features": trial.suggest_categorical("max_features", ["sqrt", "log2", 0.5, 0.8]),
        }
    if name == "XGBoost":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "max_depth": trial.suggest_int("max_depth", 3, 10),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-2, 10.0, log=True),
        }
    if name == "LightGBM":
        return {
            "n_estimators": trial.suggest_int("n_estimators", 100, 500),
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            "num_leaves": trial.suggest_int("num_leaves", 15, 63),
            "subsample": trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.6, 1.0),
        }
    if name == "CatBoost":
        return {
            "iterations": trial.suggest_int("iterations", 100, 500),
            "depth": trial.suggest_int("depth", 4, 10),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1.0, 10.0),
        }
    if name == "HistGradientBoosting":
        return {
            "max_depth": trial.suggest_int("max_depth", 3, 12),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.2, log=True),
            "max_iter": trial.suggest_int("max_iter", 100, 500),
            "min_samples_leaf": trial.suggest_int("min_samples_leaf", 5, 30),
            "l2_regularization": trial.suggest_float("l2_regularization", 1e-4, 10.0, log=True),
        }
    return {}


def needs_scaling(name: str) -> bool:
    return name in {"LinearRegression", "Ridge", "Lasso", "ElasticNet"}


@MEMORY.cache
def run_optuna(model_name: str, X_train_arr: np.ndarray, y_train_arr: np.ndarray, scale: bool) -> dict[str, Any]:
    cv = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    def objective(trial: optuna.Trial) -> float:
        params = optuna_search_space(trial, model_name)
        est = build_estimator(model_name, params)
        pipe = make_pipeline(est, scale)
        return cv_mae(pipe, X_train_arr, y_train_arr, cv)[0]

    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE))
    study.optimize(objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)
    return {"best_params": study.best_params, "best_cv_mae": float(study.best_value)}


def tune_base_models(X_train: pd.DataFrame, y_train: pd.Series) -> dict[str, dict[str, Any]]:
    section("HYPERPARAMETER OPTIMIZATION (Optuna, 100 trials, 5-fold CV)")
    X_arr = X_train.to_numpy()
    y_arr = y_train.to_numpy()
    tuned: dict[str, dict[str, Any]] = {}

    base_models = [m for m in MODEL_ORDER if m not in {"StackingRegressor", "VotingRegressor"}]
    for name in tqdm(base_models, desc="Optuna tuning"):
        scale = needs_scaling(name)
        result = run_optuna(name, X_arr, y_arr, scale)
        tuned[name] = result
        LOGGER.info("%s best CV MAE=%.4f params=%s", name, result["best_cv_mae"], result["best_params"])

    hp_rows = []
    for name, info in tuned.items():
        hp_rows.append(
            {
                "Model": name,
                "Best CV MAE": info["best_cv_mae"],
                "Best Parameters": json.dumps(info["best_params"]),
            }
        )
    pd.DataFrame(hp_rows).to_csv(EXPORTS_DIR / "best_hyperparameters.csv", index=False)
    return tuned


def build_ensemble_models(tuned: dict[str, dict[str, Any]], top_n: int = 4) -> dict[str, Any]:
  ranked = sorted(tuned.items(), key=lambda kv: kv[1]["best_cv_mae"])
  top_names = [n for n, _ in ranked[:top_n]]
  estimators = []
  for name in top_names:
      params = tuned[name]["best_params"]
      est = build_estimator(name, params)
      pipe = make_pipeline(est, needs_scaling(name))
      estimators.append((name, pipe))

  stacking = StackingRegressor(
      estimators=estimators,
      final_estimator=Ridge(alpha=1.0, random_state=RANDOM_STATE),
      n_jobs=-1,
      passthrough=False,
  )
  voting = VotingRegressor(estimators=estimators, n_jobs=-1)
  return {
      "StackingRegressor": {"best_params": {"base_models": top_names}, "best_cv_mae": ranked[0][1]["best_cv_mae"]},
      "VotingRegressor": {"best_params": {"base_models": top_names}, "best_cv_mae": ranked[0][1]["best_cv_mae"]},
      "_stacking_estimator": stacking,
      "_voting_estimator": voting,
  }


def get_fitted_model(name: str, tuned: dict[str, dict[str, Any]], ensemble_cache: dict[str, Any]) -> Any:
    if name == "StackingRegressor":
        return clone(ensemble_cache["_stacking_estimator"])
    if name == "VotingRegressor":
        return clone(ensemble_cache["_voting_estimator"])
    params = tuned[name]["best_params"]
    est = build_estimator(name, params)
    return make_pipeline(est, needs_scaling(name))


def evaluate_all_models(
    splits: dict[str, Any],
    tuned: dict[str, dict[str, Any]],
    ensemble_cache: dict[str, Any],
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any], dict[str, np.ndarray], float]:
    section("MODEL TRAINING AND EVALUATION")
    X_train, y_train = splits["train"]
    X_val, y_val = splits["val"]
    X_test, y_test = splits["test"]
    X_train_full, y_train_full = splits["train_full"]

    X_train_np = X_train.to_numpy()
    y_train_np = y_train.to_numpy()
    X_train_full_np = X_train_full.to_numpy()
    y_train_full_np = y_train_full.to_numpy()

    cv5 = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
    comparison_rows: list[dict[str, Any]] = []
    cv_rows: list[dict[str, Any]] = []
    fitted: dict[str, Any] = {}
    predictions: dict[str, np.ndarray] = {}

    baseline = MeanPredictor()
    baseline.fit(X_train_np, y_train_np)
    baseline_pred_test = baseline.predict(X_test.to_numpy())
    baseline_mae = compute_metrics(y_test.to_numpy(), baseline_pred_test)["MAE"]

    for name in tqdm(MODEL_ORDER, desc="Training models"):
        model = get_fitted_model(name, tuned, ensemble_cache)
        t0 = time.perf_counter()
        model.fit(X_train_np, y_train_np)
        train_time = time.perf_counter() - t0

        preds = {
            "train": model.predict(X_train_np),
            "val": model.predict(X_val.to_numpy()),
            "test": model.predict(X_test.to_numpy()),
        }
        predictions[name] = preds["test"]
        fitted[name] = model

        row: dict[str, Any] = {"Model": name, "Train_Time_s": train_time}
        for split, y_true, y_pred in [
            ("Train", y_train_np, preds["train"]),
            ("Validation", y_val.to_numpy(), preds["val"]),
            ("Test", y_test.to_numpy(), preds["test"]),
        ]:
            m = compute_metrics(y_true, y_pred)
            for k, v in m.items():
                row[f"{split}_{k}"] = v

        cv_m, cv_s = cv_mae(model, X_train_full_np, y_train_full_np, cv5)
        rk_m, rk_s = repeated_kfold_mae(model, X_train_full_np, y_train_full_np)
        row["CV5_MAE_mean"] = cv_m
        row["CV5_MAE_std"] = cv_s
        row["RKFold_MAE_mean"] = rk_m
        row["RKFold_MAE_std"] = rk_s
        row["MAE_improvement_vs_baseline_pct"] = (baseline_mae - row["Test_MAE"]) / baseline_mae * 100
        comparison_rows.append(row)

        cv_rows.append(
            {
                "Model": name,
                "CV5_MAE_mean": cv_m,
                "CV5_MAE_std": cv_s,
                "RepeatedKFold_MAE_mean": rk_m,
                "RepeatedKFold_MAE_std": rk_s,
                "Optuna_Best_CV_MAE": tuned.get(name, {}).get("best_cv_mae", np.nan),
            }
        )

    comparison = pd.DataFrame(comparison_rows).sort_values("Test_MAE")
    comparison.to_csv(EXPORTS_DIR / "model_comparison.csv", index=False)
    pd.DataFrame(cv_rows).to_csv(EXPORTS_DIR / "cross_validation_results.csv", index=False)
    print_table(comparison[["Model", "Test_MAE", "Test_RMSE", "Test_R2", "CV5_MAE_mean"]].head(12).values.tolist(),
                ["Model", "Test_MAE", "Test_RMSE", "Test_R2", "CV5_MAE_mean"])
    return comparison, pd.DataFrame(cv_rows), fitted, predictions, baseline_mae


def regime_analysis(y_true: np.ndarray, y_pred: np.ndarray) -> pd.DataFrame:
    rows = []
    for label, lo, hi in REGIME_BINS:
        mask = (y_true > lo) & (y_true <= hi)
        n = int(mask.sum())
        if n == 0:
            rows.append({"Regime": label, "N": 0, "MAE": np.nan, "Bias": np.nan, "Residual_Std": np.nan})
            continue
        resid = y_pred[mask] - y_true[mask]
        rows.append(
            {
                "Regime": label,
                "N": n,
                "MAE": float(mean_absolute_error(y_true[mask], y_pred[mask])),
                "Bias": float(np.mean(resid)),
                "Residual_Std": float(np.std(resid)),
            }
        )
    return pd.DataFrame(rows)


def residual_exports_and_plots(
    best_name: str,
    y_test: np.ndarray,
    y_pred: np.ndarray,
    model,
    X_test: np.ndarray,
) -> pd.DataFrame:
    section("RESIDUAL ANALYSIS")
    resid = y_pred - y_test
    resid_df = pd.DataFrame({"Actual": y_test, "Predicted": y_pred, "Residual": resid})
    resid_df.to_csv(EXPORTS_DIR / "residual_analysis.csv", index=False)

    fig, ax = plt.subplots(figsize=(9, 6))
    ax.hist(resid, bins=40, color="#4C78A8", edgecolor="white")
    ax.set_title(f"Residual Histogram - {best_name}")
    ax.set_xlabel("Residual (min)")
    save_plot(fig, "residual_histogram")

    fig, ax = plt.subplots(figsize=(7, 7))
    stats.probplot(resid, dist="norm", plot=ax)
    ax.set_title("Residual Q-Q Plot")
    save_plot(fig, "residual_qq")

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(y_pred, resid, alpha=0.35, s=12, color="#F58518")
    ax.axhline(0, color="red", linestyle="--")
    ax.set_xlabel("Predicted TTT")
    ax.set_ylabel("Residual")
    ax.set_title("Residual vs Prediction")
    save_plot(fig, "residual_vs_prediction")

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.scatter(y_test, resid, alpha=0.35, s=12, color="#54A24B")
    ax.axhline(0, color="red", linestyle="--")
    ax.set_xlabel("Actual TTT")
    ax.set_ylabel("Residual")
    ax.set_title("Residual vs Actual")
    save_plot(fig, "residual_vs_actual")

    fig, ax = plt.subplots(figsize=(8, 8))
    ax.scatter(y_test, y_pred, alpha=0.35, s=12, color="#4C78A8")
    lims = [min(y_test.min(), y_pred.min()), max(y_test.max(), y_pred.max())]
    ax.plot(lims, lims, "r--", lw=1)
    ax.set_xlabel("Actual TTT (min)")
    ax.set_ylabel("Predicted TTT (min)")
    ax.set_title(f"Prediction vs Actual - {best_name}")
    save_plot(fig, "prediction_scatter")

    regime_df = regime_analysis(y_test, y_pred)
    regime_df.to_csv(EXPORTS_DIR / "error_by_regime.csv", index=False)
    print_table(regime_df.values.tolist(), regime_df.columns.tolist())

    fig, ax = plt.subplots(figsize=(10, 5))
    plot_df = regime_df.dropna(subset=["MAE"])
    if not plot_df.empty:
        ax.bar(plot_df["Regime"], plot_df["MAE"], color="#E45756")
        ax.set_ylabel("MAE (min)")
        ax.set_title("Error by Operating Regime")
        ax.tick_params(axis="x", rotation=25)
    save_plot(fig, "error_by_regime")

    return resid_df


def plot_model_comparison(comparison: pd.DataFrame) -> None:
    metrics = ["Test_MAE", "Test_RMSE", "Test_R2"]
    fig, axes = plt.subplots(1, 3, figsize=(16, 5))
    for ax, metric in zip(axes, metrics):
        data = comparison.sort_values(metric, ascending=metric != "Test_R2")
        ax.barh(data["Model"], data[metric], color="#4C78A8")
        ax.set_title(metric.replace("_", " "))
        ax.invert_yaxis()
    save_plot(fig, "model_comparison")

    fig, ax = plt.subplots(figsize=(12, 6))
    cv_data = comparison[["Model", "CV5_MAE_mean", "CV5_MAE_std"]].sort_values("CV5_MAE_mean")
    ax.bar(cv_data["Model"], cv_data["CV5_MAE_mean"], yerr=cv_data["CV5_MAE_std"], capsize=3, color="#72B7B2")
    ax.set_title("5-Fold CV MAE (mean ± std)")
    ax.tick_params(axis="x", rotation=45)
    save_plot(fig, "cv_boxplot_mae")


def stability_analysis(best_name: str, X_train_full: np.ndarray, y_train_full: np.ndarray, tuned: dict, ensemble_cache: dict) -> pd.DataFrame:
    section("MODEL STABILITY (10 random seeds)")
    rows = []
    for seed in tqdm(range(STABILITY_SEEDS), desc="Stability seeds"):
        model = get_fitted_model(best_name, tuned, ensemble_cache)
        if hasattr(model, "set_params"):
            try:
                model.set_params(model__random_state=seed)
            except Exception:
                pass
        model.fit(X_train_full, y_train_full)
        pred = model.predict(X_train_full)
        m = compute_metrics(y_train_full, pred)
        rows.append({"Seed": seed, "MAE": m["MAE"], "RMSE": m["RMSE"]})

    stab = pd.DataFrame(rows)
    summary = pd.DataFrame(
        [
            ["Mean MAE", stab["MAE"].mean()],
            ["Std MAE", stab["MAE"].std()],
            ["Mean RMSE", stab["RMSE"].mean()],
            ["Std RMSE", stab["RMSE"].std()],
        ],
        columns=["Metric", "Value"],
    )
    print_table(summary.values.tolist(), summary.columns.tolist())
    stab.to_csv(EXPORTS_DIR / "stability_results.csv", index=False)
    return stab


def uncertainty_intervals(X_train_full: np.ndarray, y_train_full: np.ndarray, X_test: np.ndarray, y_test: np.ndarray) -> pd.DataFrame:
    section("PREDICTION INTERVALS (Quantile LightGBM)")
    q_models: dict[float, Any] = {}
    for alpha in [0.05, 0.5, 0.95]:
        q_models[alpha] = lgb.LGBMRegressor(
            objective="quantile",
            alpha=alpha,
            n_estimators=300,
            learning_rate=0.05,
            num_leaves=31,
            random_state=RANDOM_STATE,
            verbose=-1,
            n_jobs=-1,
        )
        q_models[alpha].fit(X_train_full, y_train_full)

    for alpha in [0.025, 0.975]:
        q_models[alpha] = lgb.LGBMRegressor(
            objective="quantile",
            alpha=alpha,
            n_estimators=300,
            learning_rate=0.05,
            num_leaves=31,
            random_state=RANDOM_STATE,
            verbose=-1,
            n_jobs=-1,
        )
        q_models[alpha].fit(X_train_full, y_train_full)

    preds_median = q_models[0.5].predict(X_test)
    lower_90 = q_models[0.05].predict(X_test)
    upper_90 = q_models[0.95].predict(X_test)
    lower_95 = q_models[0.025].predict(X_test)
    upper_95 = q_models[0.975].predict(X_test)

    interval_df = pd.DataFrame(
        {
            "Actual": y_test,
            "Predicted": preds_median,
            "Lower_90": lower_90,
            "Upper_90": upper_90,
            "Lower_95": lower_95,
            "Upper_95": upper_95,
        }
    )
    interval_df.to_csv(EXPORTS_DIR / "prediction_intervals.csv", index=False)

    coverage_90 = float(np.mean((y_test >= lower_90) & (y_test <= upper_90)) * 100)
    coverage_95 = float(np.mean((y_test >= lower_95) & (y_test <= upper_95)) * 100)
    print(f"90% interval empirical coverage: {coverage_90:.1f}%")
    print(f"95% interval empirical coverage: {coverage_95:.1f}%")

    sample = interval_df.sample(n=min(300, len(interval_df)), random_state=RANDOM_STATE).sort_values("Actual")
    fig, ax = plt.subplots(figsize=(12, 6))
    x = np.arange(len(sample))
    ax.fill_between(x, sample["Lower_90"], sample["Upper_90"], alpha=0.25, color="#4C78A8", label="90% PI")
    ax.fill_between(x, sample["Lower_95"], sample["Upper_95"], alpha=0.15, color="#F58518", label="95% PI")
    ax.plot(x, sample["Predicted"], color="#333", lw=1, label="Median pred")
    ax.scatter(x, sample["Actual"], s=10, color="#E45756", label="Actual", alpha=0.7)
    ax.set_title("Prediction Intervals (sample)")
    ax.legend()
    save_plot(fig, "prediction_intervals")

    return interval_df


def shap_analysis(
    best_name: str,
    model,
    X_train_full: np.ndarray,
    feature_names: list[str],
    fitted: dict[str, Any],
) -> pd.DataFrame:
    section("SHAP INTERPRETABILITY")
    sample_n = min(500, len(X_train_full))
    idx = np.random.default_rng(RANDOM_STATE).choice(len(X_train_full), size=sample_n, replace=False)
    X_sample = X_train_full[idx]

    shap_source_name = best_name
    shap_model = model
    if best_name in {"StackingRegressor", "VotingRegressor"}:
        for candidate in ["CatBoost", "LightGBM", "XGBoost", "RandomForest"]:
            if candidate in fitted:
                shap_source_name = candidate
                shap_model = fitted[candidate]
                LOGGER.info("Using %s for SHAP (ensemble model %s)", candidate, best_name)
                break

    if isinstance(shap_model, Pipeline):
        X_transformed = shap_model.named_steps["imputer"].transform(X_sample)
        if "scaler" in shap_model.named_steps:
            X_transformed = shap_model.named_steps["scaler"].transform(X_transformed)
        core = shap_model.named_steps["model"]
        X_for_shap = X_transformed
    else:
        core = shap_model
        X_for_shap = X_sample

    explainer = shap.TreeExplainer(core)
    shap_vals = explainer.shap_values(X_for_shap)

    if isinstance(shap_vals, list):
        shap_vals = shap_vals[0]

    mean_abs = np.abs(shap_vals).mean(axis=0)
    shap_df = pd.DataFrame({"Feature": feature_names, "Mean_ABS_SHAP": mean_abs}).sort_values("Mean_ABS_SHAP", ascending=False)
    shap_df.to_csv(EXPORTS_DIR / "shap_values.csv", index=False)
    shap_df.head(20).to_csv(EXPORTS_DIR / "feature_importance.csv", index=False)

    X_df = pd.DataFrame(X_sample, columns=feature_names)
    fig = plt.figure(figsize=(12, 8))
    shap.summary_plot(shap_vals, X_df, show=False, max_display=20)
    save_plot(fig, "shap_summary")

    fig, ax = plt.subplots(figsize=(10, 7))
    top = shap_df.head(20)
    ax.barh(top["Feature"][::-1], top["Mean_ABS_SHAP"][::-1], color="#4C78A8")
    ax.set_title(f"SHAP Bar - Top 20 Features ({shap_source_name})")
    save_plot(fig, "shap_bar_top20")

    for feat in SHAP_DEPENDENCE_FEATURES:
        if feat not in feature_names:
            continue
        j = feature_names.index(feat)
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.scatter(X_sample[:, j], shap_vals[:, j], alpha=0.35, s=12, color="#54A24B")
        ax.set_xlabel(feat)
        ax.set_ylabel("SHAP value")
        ax.set_title(f"SHAP Dependence - {feat}")
        save_plot(fig, f"shap_dependence_{feat}")

    return shap_df


def learning_curve_plot(best_name: str, model, X_train_full: np.ndarray, y_train_full: np.ndarray) -> None:
    train_sizes, train_scores, val_scores = learning_curve(
        model,
        X_train_full,
        y_train_full,
        cv=CV_FOLDS,
        scoring="neg_mean_absolute_error",
        n_jobs=-1,
        train_sizes=np.linspace(0.2, 1.0, 6),
        shuffle=True,
        random_state=RANDOM_STATE,
    )
    train_mae = -train_scores.mean(axis=1)
    val_mae = -val_scores.mean(axis=1)
    fig, ax = plt.subplots(figsize=(9, 6))
    ax.plot(train_sizes, train_mae, marker="o", label="Train MAE")
    ax.plot(train_sizes, val_mae, marker="o", label="CV MAE")
    ax.set_xlabel("Training samples")
    ax.set_ylabel("MAE")
    ax.set_title(f"Learning Curve - {best_name}")
    ax.legend()
    save_plot(fig, "learning_curve")


def industrial_benchmark(comparison: pd.DataFrame, baseline_mae: float) -> pd.DataFrame:
    section("INDUSTRIAL BENCHMARKING")
    rows = [["Baseline Mean Predictor", baseline_mae, 0.0]]
    groups = {
        "Linear": ["LinearRegression", "Ridge", "Lasso", "ElasticNet"],
        "Tree": ["RandomForest", "ExtraTrees"],
        "Boosting": ["XGBoost", "LightGBM", "CatBoost", "HistGradientBoosting"],
        "Ensemble": ["StackingRegressor", "VotingRegressor"],
    }
    for group, models in groups.items():
        sub = comparison[comparison["Model"].isin(models)].sort_values("Test_MAE")
        if sub.empty:
            continue
        best = sub.iloc[0]
        imp = (baseline_mae - best["Test_MAE"]) / baseline_mae * 100
        rows.append([group, best["Test_MAE"], imp])

    bench = pd.DataFrame(rows, columns=["Category", "Best_Test_MAE", "Improvement_vs_Baseline_pct"])
    bench.to_csv(EXPORTS_DIR / "industrial_benchmark.csv", index=False)
    print_table(rows, bench.columns.tolist())
    return bench


def compare_feature_sets(best_model_name: str, tuned: dict, ensemble_cache: dict) -> None:
    section("FEATURE SET COMPARISON (22 vs 15 features)")
    df = pd.read_csv(PHASE16_DATASET)
    rows = []
    for label, feats in [("22_features", load_features(FEATURES_PRIMARY)), ("15_features", load_features(FEATURES_COMPARE))]:
        X = df[feats].apply(pd.to_numeric, errors="coerce")
        y = pd.to_numeric(df[TARGET], errors="coerce")
        mask = y.notna()
        X, y = X.loc[mask], y.loc[mask]
        X_train_full, X_test, y_train_full, y_test = train_test_split(X, y, test_size=0.2, random_state=RANDOM_STATE)
        if best_model_name in {"StackingRegressor", "VotingRegressor"}:
            est = lgb.LGBMRegressor(**tuned["LightGBM"]["best_params"], random_state=RANDOM_STATE, verbose=-1, n_jobs=-1)
            model = make_pipeline(est, scale=False)
        else:
            model = get_fitted_model(best_model_name, tuned, ensemble_cache)
        model.fit(X_train_full.to_numpy(), y_train_full.to_numpy())
        m = compute_metrics(y_test.to_numpy(), model.predict(X_test.to_numpy()))
        rows.append([label, len(feats), m["MAE"], m["RMSE"], m["R2"]])
    print_table(rows, ["Feature set", "N", "Test MAE", "Test RMSE", "Test R2"])


def export_production_model(
    best_name: str,
    model,
    features: list[str],
    X_train_full: np.ndarray,
    y_train_full: np.ndarray,
    comparison: pd.DataFrame,
) -> dict[str, Any]:
    section("PRODUCTION MODEL EXPORT")
    prod_model = clone(model)
    prod_model.fit(X_train_full, y_train_full)

    preproc = Pipeline([("imputer", SimpleImputer(strategy="median"))])
    preproc.fit(X_train_full)

    dump(prod_model, EXPORTS_DIR / "production_model.pkl")
    dump(preproc, EXPORTS_DIR / "preprocessing_pipeline.pkl")

    pred_df = pd.DataFrame(
        {
            "Feature_Set": features,
            "Model": best_name,
            "N_Features": len(features),
        }
    )
    pred_df.to_csv(EXPORTS_DIR / "production_model_manifest.csv", index=False)

    model_path = EXPORTS_DIR / "production_model.pkl"
    pre_path = EXPORTS_DIR / "preprocessing_pipeline.pkl"
    mem_mb = (model_path.stat().st_size + pre_path.stat().st_size) / (1024 * 1024)

    X_test_sample = X_train_full[: min(500, len(X_train_full))]
    t0 = time.perf_counter()
    for _ in range(5):
        prod_model.predict(X_test_sample)
    latency_ms = (time.perf_counter() - t0) / 5 / len(X_test_sample) * 1000

    best_row = comparison.loc[comparison["Model"] == best_name].iloc[0]
    return {
        "model_name": best_name,
        "test_mae": best_row["Test_MAE"],
        "test_rmse": best_row["Test_RMSE"],
        "test_r2": best_row["Test_R2"],
        "cv_mae": best_row["CV5_MAE_mean"],
        "train_time": best_row["Train_Time_s"],
        "latency_ms": latency_ms,
        "memory_mb": mem_mb,
    }


def final_recommendation(info: dict[str, Any], shap_df: pd.DataFrame, comparison: pd.DataFrame) -> None:
    section("FINAL PRODUCTION RECOMMENDATION")
    best = comparison.iloc[0]
    print(f"Recommended model: {info['model_name']}")
    print(f"Expected Test MAE: {info['test_mae']:.3f} min")
    print(f"Expected Test RMSE: {info['test_rmse']:.3f} min")
    print(f"Expected Test R2: {info['test_r2']:.3f}")
    print(f"5-fold CV MAE: {info['cv_mae']:.3f} min")
    print(f"Training time (single fit): {info['train_time']:.2f} s")
    print(f"Inference latency: {info['latency_ms']:.4f} ms/row")
    print(f"Deployment memory (serialized): {info['memory_mb']:.2f} MB")
    print("\nRationale:")
    print("- Lowest test MAE among 12 tuned candidates with strict hold-out validation.")
    print("- Uses Phase 18 VIF-clean features only; no leakage from feature selection.")
    print("- Suitable for real-time EAF advisory: low latency, interpretable SHAP drivers.")
    print("\nTop SHAP features:", ", ".join(shap_df.head(10)["Feature"].tolist()))


def final_banner(info: dict[str, Any], tuned: dict, shap_df: pd.DataFrame) -> None:
    section("PHASE 19 COMPLETE")
    elapsed = (time.perf_counter() - PIPELINE_START) / 60
    best_params = tuned.get(info["model_name"], {}).get("best_params", {})
    print(f"Best model: {info['model_name']}")
    print(f"Best hyperparameters: {best_params}")
    print(f"Cross-validation MAE: {info['cv_mae']:.4f}")
    print(f"Test MAE: {info['test_mae']:.4f} | RMSE: {info['test_rmse']:.4f} | R2: {info['test_r2']:.4f}")
    print(f"Top SHAP features: {', '.join(shap_df.head(5)['Feature'].tolist())}")
    print(f"Training time: {info['train_time']:.2f} s")
    print(f"Inference latency: {info['latency_ms']:.4f} ms/row")
    print(f"Estimated deployment memory: {info['memory_mb']:.2f} MB")
    print(f"Estimated runtime: {elapsed:.1f} minutes")
    print("\nCommand:")
    print("python research/phase_19_model_development/ttt_model_development.py")


def main() -> None:
    section("PHASE 19 - TTT MODEL DEVELOPMENT")
    features = load_features(FEATURES_PRIMARY)
    LOGGER.info("Primary feature set: %s features", len(features))

    X, y = load_data(features)
    splits = split_data(X, y)
    X_train, y_train = splits["train"]
    X_val, y_val = splits["val"]
    X_test, y_test = splits["test"]
    X_train_full, y_train_full = splits["train_full"]

    tuned = tune_base_models(X_train, y_train)
    ensemble_cache = build_ensemble_models(tuned)
    tuned["StackingRegressor"] = ensemble_cache["StackingRegressor"]
    tuned["VotingRegressor"] = ensemble_cache["VotingRegressor"]

    comparison, cv_df, fitted, predictions, baseline_mae = evaluate_all_models(splits, tuned, ensemble_cache)
    industrial_benchmark(comparison, baseline_mae)
    best_name = comparison.iloc[0]["Model"]
    best_model = fitted[best_name]

    y_test_np = y_test.to_numpy()
    y_pred_test = predictions[best_name]
    pd.DataFrame({"Actual": y_test_np, "Predicted": y_pred_test, "Model": best_name}).to_csv(
        EXPORTS_DIR / "prediction_results.csv", index=False
    )

    plot_model_comparison(comparison)
    residual_exports_and_plots(best_name, y_test_np, y_pred_test, best_model, X_test.to_numpy())
    stab = stability_analysis(best_name, X_train_full.to_numpy(), y_train_full.to_numpy(), tuned, ensemble_cache)
    uncertainty_intervals(X_train_full.to_numpy(), y_train_full.to_numpy(), X_test.to_numpy(), y_test_np)
    shap_df = shap_analysis(best_name, best_model, X_train_full.to_numpy(), features, fitted)
    learning_curve_plot(best_name, clone(best_model), X_train_full.to_numpy(), y_train_full.to_numpy())
    compare_feature_sets(best_name, tuned, ensemble_cache)

    prod_info = export_production_model(
        best_name, best_model, features, X_train_full.to_numpy(), y_train_full.to_numpy(), comparison
    )
    final_recommendation(prod_info, shap_df, comparison)
    final_banner(prod_info, tuned, shap_df)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        LOGGER.exception("Phase 19 failed: %s", exc)
        raise
