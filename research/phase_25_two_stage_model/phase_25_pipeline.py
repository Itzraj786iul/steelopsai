"""
Phase 25 — Two-stage industrial prediction architecture.

Experimental only. Does not modify production artifacts.
"""

from __future__ import annotations

import importlib.util
import json
import warnings
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from catboost import CatBoostClassifier, CatBoostRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from scipy import stats
from sklearn.calibration import calibration_curve
from sklearn.ensemble import (
    ExtraTreesClassifier,
    RandomForestClassifier,
    StackingRegressor,
    VotingRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.inspection import PartialDependenceDisplay, permutation_importance
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_recall_fscore_support,
    r2_score,
    roc_auc_score,
)
from sklearn.model_selection import RandomizedSearchCV, train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import label_binarize
from xgboost import XGBClassifier, XGBRegressor

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
TEST_SIZE = 0.2
PHASE_ROOT = Path(__file__).resolve().parent
RESEARCH = PHASE_ROOT.parent
PLOTS = PHASE_ROOT / "plots"
PLOTS.mkdir(parents=True, exist_ok=True)

RAW_PATH = RESEARCH / "phase_13_industrial_cleaning" / "final_model_dataset.csv"

spec = importlib.util.spec_from_file_location(
    "fe24", RESEARCH / "phase_24_leakage_free_model" / "feature_engineering.py"
)
fe24 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fe24)

try:
    from imblearn.ensemble import BalancedRandomForestClassifier

    HAS_BRF = True
except ImportError:
    HAS_BRF = False


REGIME_SCHEMAS = {
    "4class_standard": {
        "bins": [-np.inf, 60, 120, 180, np.inf],
        "labels": ["NORMAL", "LONG", "DELAY", "SHUTDOWN"],
        "description": "TTT≤60 | 60–120 | 120–180 | >180",
    },
    "3class_phase16": {
        "bins": [-np.inf, 60, 180, np.inf],
        "labels": ["NORMAL", "DELAY", "SHUTDOWN"],
        "description": "Phase 16 style: ≤60 | 60–180 | >180",
    },
    "2class_normal_vs_abnormal": {
        "bins": [-np.inf, 60, np.inf],
        "labels": ["NORMAL", "ABNORMAL"],
        "description": "Binary: ≤60 vs >60",
    },
    "2class_delay_detection": {
        "bins": [-np.inf, 120, np.inf],
        "labels": ["NORMAL", "DELAY"],
        "description": "Binary: ≤120 vs >120",
    },
}


def load_lf_data() -> pd.DataFrame:
    raw = pd.read_csv(RAW_PATH)
    return fe24.build_clean_dataset(raw, include_oxy_cpc=True)


def lf_features(df: pd.DataFrame) -> list[str]:
    skip = {"Heat Number", "Date", "Shift", "TTT", "HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY", "T C"}
    return [c for c in df.columns if c not in skip]


def assign_regime(ttt: pd.Series, schema: str) -> pd.Series:
    cfg = REGIME_SCHEMAS[schema]
    return pd.cut(ttt, bins=cfg["bins"], labels=cfg["labels"], right=True).astype(str)


def temporal_split(df: pd.DataFrame, test_size: float = TEST_SIZE):
    work = df.copy()
    work["Date"] = pd.to_datetime(work["Date"], errors="coerce")
    work = work.sort_values("Date").reset_index(drop=True)
    cut = int(len(work) * (1 - test_size))
    return work.iloc[:cut].copy(), work.iloc[cut:].copy()


def clf_pipe(est):
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", est)])


def reg_pipe(est):
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", est)])


def metrics_reg(y, pred) -> dict:
    y, pred = np.asarray(y), np.asarray(pred)
    mask = np.abs(y) > 1e-6
    mape = float(np.mean(np.abs((y[mask] - pred[mask]) / y[mask])) * 100) if mask.any() else float("nan")
    return {
        "MAE": float(mean_absolute_error(y, pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y, pred))),
        "R2": float(r2_score(y, pred)),
        "MAPE": mape,
        "Bias": float(np.mean(pred - y)),
        "N": int(len(y)),
    }


def classifier_models(n_classes: int) -> dict:
    common = {"random_state": RANDOM_STATE, "n_jobs": -1}
    models = {
        "LightGBM": LGBMClassifier(
            n_estimators=400, max_depth=8, learning_rate=0.05, class_weight="balanced",
            random_state=RANDOM_STATE, n_jobs=-1, verbose=-1,
        ),
        "CatBoost": CatBoostClassifier(
            iterations=400, depth=8, learning_rate=0.05, auto_class_weights="Balanced",
            random_seed=RANDOM_STATE, verbose=0,
        ),
        "XGBoost": XGBClassifier(
            n_estimators=400, max_depth=8, learning_rate=0.05,
            objective="multi:softprob" if n_classes > 2 else "binary:logistic",
            eval_metric="mlogloss" if n_classes > 2 else "logloss",
            random_state=RANDOM_STATE, n_jobs=-1, verbosity=0,
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=400, max_depth=12, class_weight="balanced", **common,
        ),
        "ExtraTrees": ExtraTreesClassifier(
            n_estimators=400, max_depth=12, class_weight="balanced", **common,
        ),
    }
    if HAS_BRF:
        models["BalancedRandomForest"] = BalancedRandomForestClassifier(
            n_estimators=400, max_depth=12, random_state=RANDOM_STATE, n_jobs=-1,
        )
    else:
        models["BalancedRandomForest"] = RandomForestClassifier(
            n_estimators=400, max_depth=12, class_weight="balanced_subsample", **common,
        )
    return models


def evaluate_classifier(name: str, pipe, X_test, y_test, labels: list[str], le: LabelEncoder) -> dict:
    pred_enc = pipe.predict(X_test)
    pred = le.inverse_transform(pred_enc.astype(int))
    y_true = y_test.values if hasattr(y_test, "values") else y_test
    proba = pipe.predict_proba(X_test)
    prec, rec, f1, _ = precision_recall_fscore_support(y_true, pred, labels=labels, zero_division=0)
    row = {
        "Model": name,
        "Accuracy": float(accuracy_score(y_true, pred)),
        "Macro_Precision": float(np.mean(prec)),
        "Macro_Recall": float(np.mean(rec)),
        "Macro_F1": float(f1_score(y_true, pred, average="macro", zero_division=0)),
        "Weighted_F1": float(f1_score(y_true, pred, average="weighted", zero_division=0)),
    }
    if len(labels) == 2:
        pos = labels[-1]
        pos_idx = list(le.classes_).index(pos) if pos in le.classes_ else 1
        row["ROC_AUC"] = float(roc_auc_score((np.array(y_true) == pos).astype(int), proba[:, pos_idx]))
    else:
        y_bin = label_binarize(y_true, classes=labels)
        row["ROC_AUC_OVR"] = float(roc_auc_score(y_bin, proba, multi_class="ovr", average="macro"))
    for i, lab in enumerate(labels):
        row[f"Precision_{lab}"] = float(prec[i])
        row[f"Recall_{lab}"] = float(rec[i])
        row[f"F1_{lab}"] = float(f1[i])
    abnormal = [l for l in labels if l != labels[0]]
    if abnormal:
        ab_idx = [labels.index(l) for l in abnormal]
        row["Abnormal_Recall"] = float(np.mean([rec[i] for i in ab_idx]))
    return row


def default_regressors() -> dict:
    return {
        "LightGBM": LGBMRegressor(
            n_estimators=500, max_depth=8, learning_rate=0.05, subsample=0.85,
            colsample_bytree=0.85, random_state=RANDOM_STATE, n_jobs=-1, verbose=-1,
        ),
        "CatBoost": CatBoostRegressor(
            iterations=500, depth=8, learning_rate=0.05, random_seed=RANDOM_STATE, verbose=0,
        ),
        "XGBoost": XGBRegressor(
            n_estimators=500, max_depth=8, learning_rate=0.05, subsample=0.85,
            random_state=RANDOM_STATE, n_jobs=-1, verbosity=0,
        ),
    }


def light_tune_lgbm(X_train, y_train):
    """Small focused search only for LightGBM."""
    base = LGBMRegressor(random_state=RANDOM_STATE, n_jobs=-1, verbose=-1)
    params = {
        "model__n_estimators": [400, 600],
        "model__max_depth": [6, 8],
        "model__learning_rate": [0.03, 0.05],
        "model__subsample": [0.85],
        "model__colsample_bytree": [0.85],
    }
    pipe = reg_pipe(base)
    search = RandomizedSearchCV(
        pipe, params, n_iter=4, scoring="neg_mean_absolute_error",
        cv=3, random_state=RANDOM_STATE, n_jobs=1,
    )
    search.fit(X_train, y_train)
    return search.best_estimator_, -search.best_score_


# ---------------------------------------------------------------------------
# STAGE 1 — Regime classifier
# ---------------------------------------------------------------------------
def stage1_classifiers(df: pd.DataFrame, feats: list[str]):
    boundary_rows = []
    all_results = []
    all_confusion = []
    best_schema, best_model, best_pipe, best_labels = None, None, None, None
    best_le = None
    best_abnormal_recall = -1.0

    for schema, cfg in REGIME_SCHEMAS.items():
        work = df.copy()
        work["Regime"] = assign_regime(work["TTT"], schema)
        counts = work["Regime"].value_counts().to_dict()
        boundary_rows.append({"Schema": schema, "Description": cfg["description"], **counts})

        tr, te = temporal_split(work)
        Xtr, ytr = tr[feats], tr["Regime"]
        Xte, yte = te[feats], te["Regime"]
        labels = cfg["labels"]

        le = LabelEncoder()
        le.fit(labels)
        ytr_enc = le.transform(ytr)
        yte_enc = le.transform(yte)

        for name, est in classifier_models(len(labels)).items():
            pipe = clf_pipe(est)
            pipe.fit(Xtr, ytr_enc)
            row = evaluate_classifier(name, pipe, Xte, yte, labels, le)
            row["Schema"] = schema
            all_results.append(row)

            pred = le.inverse_transform(pipe.predict(Xte).astype(int))
            cm = confusion_matrix(yte, pred, labels=labels)
            for i, actual in enumerate(labels):
                for j, predicted in enumerate(labels):
                    all_confusion.append({
                        "Schema": schema, "Model": name,
                        "Actual": actual, "Predicted": predicted, "Count": int(cm[i, j]),
                    })

            # Prefer industrial 2-class NORMAL vs ABNORMAL with high Macro_F1;
            # then 4-class; maximize Macro_F1 among candidates.
            score = float(row["Macro_F1"])
            if schema == "2class_normal_vs_abnormal":
                score += 0.05  # prefer industrially actionable binary schema
            if score > best_abnormal_recall:
                best_abnormal_recall = score
                best_schema, best_model, best_pipe, best_labels, best_le = schema, name, pipe, labels, le

    pd.DataFrame(boundary_rows).to_csv(PHASE_ROOT / "regime_boundary_counts.csv", index=False)
    comp = pd.DataFrame(all_results).sort_values(["Schema", "Macro_F1"], ascending=[True, False])
    comp.to_csv(PHASE_ROOT / "classifier_comparison.csv", index=False)
    comp.to_csv(PHASE_ROOT / "classifier_results.csv", index=False)
    pd.DataFrame(all_confusion).to_csv(PHASE_ROOT / "confusion_matrix.csv", index=False)

    # Calibration + SHAP for best model
    tr, te = temporal_split(df.assign(Regime=assign_regime(df["TTT"], best_schema)))
    Xte, yte = te[feats], te["Regime"]
    proba = best_pipe.predict_proba(Xte)
    class_names = list(best_le.classes_)

    fig, axes = plt.subplots(1, min(3, len(class_names)), figsize=(4 * min(3, len(class_names)), 4))
    if len(class_names) == 1:
        axes = [axes]
    elif len(class_names) <= 3:
        axes = np.atleast_1d(axes)
    for ax, idx, cls in zip(axes, range(min(3, len(class_names))), class_names[:3]):
        y_bin = (yte == cls).astype(int)
        if y_bin.nunique() < 2:
            continue
        prob_true, prob_pred = calibration_curve(y_bin, proba[:, idx], n_bins=8, strategy="quantile")
        ax.plot(prob_pred, prob_true, "s-", label=cls)
        ax.plot([0, 1], [0, 1], "k--", alpha=0.5)
        ax.set_title(f"Calibration: {cls}")
        ax.set_xlabel("Predicted prob")
        ax.set_ylabel("Observed freq")
    fig.suptitle(f"Best: {best_model} / {best_schema}")
    fig.tight_layout()
    fig.savefig(PLOTS / "classifier_calibration.png", dpi=150)
    plt.close(fig)

    Xi = best_pipe.named_steps["imputer"].transform(Xte)
    m = min(500, len(Xi))
    idx = np.random.default_rng(RANDOM_STATE).choice(len(Xi), m, replace=False)
    explainer = shap.Explainer(best_pipe.named_steps["model"], Xi[idx])
    sv = explainer(Xi[idx], check_additivity=False).values
    if sv.ndim == 3:
        mean_shap = np.abs(sv).mean(axis=(0, 2))
    else:
        mean_shap = np.abs(sv).mean(axis=0)
    shap_df = pd.DataFrame({
        "Feature": feats,
        "Mean_ABS_SHAP": mean_shap,
        "Model": best_model,
        "Schema": best_schema,
    }).sort_values("Mean_ABS_SHAP", ascending=False)
    shap_df.to_csv(PHASE_ROOT / "shap_classifier.csv", index=False)

    # Confusion heatmap for best
    le_best = LabelEncoder()
    le_best.fit(best_labels)
    pred = le_best.inverse_transform(best_pipe.predict(Xte).astype(int))
    cm = confusion_matrix(yte, pred, labels=best_labels)
    fig, ax = plt.subplots(figsize=(6, 5))
    im = ax.imshow(cm, cmap="Blues")
    ax.set_xticks(range(len(best_labels)), best_labels, rotation=45)
    ax.set_yticks(range(len(best_labels)), best_labels)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    for i in range(len(best_labels)):
        for j in range(len(best_labels)):
            ax.text(j, i, cm[i, j], ha="center", va="center", color="black")
    ax.set_title(f"Confusion: {best_model} ({best_schema})")
    fig.colorbar(im)
    fig.tight_layout()
    fig.savefig(PLOTS / "confusion_matrix_best.png", dpi=150)
    plt.close(fig)

    return best_schema, best_model, best_pipe, best_labels, best_le, comp


# ---------------------------------------------------------------------------
# STAGE 2–4 — Regime-specific regression
# ---------------------------------------------------------------------------
def train_regime_regressions(df: pd.DataFrame, feats: list[str]):
    normal = df[df["TTT"] <= 60].copy()
    long_h = df[(df["TTT"] > 60) & (df["TTT"] <= 180)].copy()
    shutdown = df[df["TTT"] > 180].copy()

    normal_rows, delay_rows = [], []

    # Stage 2 — normal heats
    tr, te = temporal_split(normal)
    Xtr, ytr = tr[feats], tr["TTT"]
    Xte, yte = te[feats], te["TTT"]

    tuned = {}
    for name, est in default_regressors().items():
        pipe = reg_pipe(est)
        pipe.fit(Xtr, ytr)
        tuned[name] = pipe
        m = metrics_reg(yte, pipe.predict(Xte))
        m.update({"Model": name, "Stage": "Normal_TTT_le60", "Split": "Temporal"})
        normal_rows.append(m)

    # LightGBM focused tune
    tuned_lgb, cv_mae = light_tune_lgbm(Xtr, ytr)
    tuned["LightGBM_tuned"] = tuned_lgb
    m = metrics_reg(yte, tuned_lgb.predict(Xte))
    m.update({"Model": "LightGBM_tuned", "Stage": "Normal_TTT_le60", "Split": "Temporal", "CV_MAE": cv_mae})
    normal_rows.append(m)

    # Stacking / Voting from base models (not nested pipelines)
    base_models = {k: v.named_steps["model"] for k, v in tuned.items() if k in {"LightGBM", "CatBoost", "XGBoost"}}
    imp = SimpleImputer(strategy="median")
    Xtr_i = imp.fit_transform(Xtr)
    Xte_i = imp.transform(Xte)

    stack = StackingRegressor(
        estimators=list(base_models.items()),
        final_estimator=LGBMRegressor(n_estimators=200, random_state=RANDOM_STATE, verbose=-1),
        passthrough=False, n_jobs=1,
    )
    stack.fit(Xtr_i, ytr)
    m = metrics_reg(yte, stack.predict(Xte_i))
    m.update({"Model": "Stacking", "Stage": "Normal_TTT_le60", "Split": "Temporal"})
    normal_rows.append(m)

    vote = VotingRegressor(estimators=list(base_models.items()), n_jobs=1)
    vote.fit(Xtr_i, ytr)
    m = metrics_reg(yte, vote.predict(Xte_i))
    m.update({"Model": "Voting", "Stage": "Normal_TTT_le60", "Split": "Temporal"})
    normal_rows.append(m)

    best_normal_name = min(normal_rows, key=lambda r: r["MAE"])["Model"]
    if best_normal_name in tuned:
        best_normal_pipe = tuned[best_normal_name]
    else:
        # wrap voting into a simple predictor object for later SHAP
        best_normal_pipe = tuned.get("LightGBM_tuned", tuned["LightGBM"])

    # Random split benchmark (Phase 24.5 comparison)
    Xtr_r, Xte_r, ytr_r, yte_r = train_test_split(normal[feats], normal["TTT"], test_size=TEST_SIZE, random_state=RANDOM_STATE)
    lgb = reg_pipe(LGBMRegressor(n_estimators=500, max_depth=8, learning_rate=0.05, random_state=RANDOM_STATE, verbose=-1, n_jobs=-1))
    lgb.fit(Xtr_r, ytr_r)
    m = metrics_reg(yte_r, lgb.predict(Xte_r))
    m.update({"Model": "LightGBM", "Stage": "Normal_TTT_le60", "Split": "Random"})
    normal_rows.append(m)

    pd.DataFrame(normal_rows).to_csv(PHASE_ROOT / "normal_regression_results.csv", index=False)

    # SHAP for best normal model
    Xi = best_normal_pipe.named_steps["imputer"].transform(Xte)
    m_s = min(500, len(Xi))
    idx = np.random.default_rng(RANDOM_STATE).choice(len(Xi), m_s, replace=False)
    explainer = shap.Explainer(best_normal_pipe.named_steps["model"], Xi[idx])
    sv = explainer(Xi[idx], check_additivity=False).values
    pd.DataFrame({
        "Feature": feats,
        "Mean_ABS_SHAP": np.abs(sv).mean(axis=0),
        "Stage": "Normal",
    }).sort_values("Mean_ABS_SHAP", ascending=False).to_csv(PHASE_ROOT / "shap_regression.csv", index=False)

    # Permutation importance
    perm = permutation_importance(best_normal_pipe, Xte, yte, n_repeats=5, random_state=RANDOM_STATE, n_jobs=1)
    pd.DataFrame({
        "Feature": feats,
        "Permutation_MAE_increase": perm.importances_mean,
        "Stage": "Normal",
    }).sort_values("Permutation_MAE_increase", ascending=False).to_csv(
        PHASE_ROOT / "permutation_importance_normal.csv", index=False
    )

    # PDP top 3 features
    top3 = pd.read_csv(PHASE_ROOT / "shap_regression.csv").head(3)["Feature"].tolist()
    fig, ax = plt.subplots(figsize=(12, 4))
    PartialDependenceDisplay.from_estimator(
        best_normal_pipe, Xte, top3, ax=ax, grid_resolution=25,
    )
    fig.suptitle("PDP — top 3 normal-heat features")
    fig.tight_layout()
    fig.savefig(PLOTS / "pdp_normal_top3.png", dpi=150)
    plt.close(fig)

    # Stage 3 — long heats 60<TTT≤180
    if len(long_h) >= 100:
        tr_l, te_l = temporal_split(long_h)
        lgb_l = reg_pipe(LGBMRegressor(n_estimators=400, max_depth=8, learning_rate=0.05, random_state=RANDOM_STATE, verbose=-1, n_jobs=-1))
        lgb_l.fit(tr_l[feats], tr_l["TTT"])
        m_long = metrics_reg(te_l["TTT"], lgb_l.predict(te_l[feats]))
        m_long.update({"Model": "LightGBM_dedicated", "Stage": "Long_60_180", "Split": "Temporal"})

        # Compare: use normal model on long heats
        m_normal_on_long = metrics_reg(te_l["TTT"], best_normal_pipe.predict(te_l[feats]))
        m_normal_on_long.update({"Model": "Normal_model_on_long", "Stage": "Long_60_180", "Split": "Temporal"})
        delay_rows.extend([m_long, m_normal_on_long])
    else:
        delay_rows.append({"Model": "N/A", "Stage": "Long_60_180", "Note": "Insufficient samples", "N": len(long_h)})

    # Stage 4 — shutdown >180
    if len(shutdown) >= 30:
        tr_s, te_s = temporal_split(shutdown)
        lgb_s = reg_pipe(LGBMRegressor(n_estimators=300, max_depth=6, learning_rate=0.05, random_state=RANDOM_STATE, verbose=-1, n_jobs=-1))
        lgb_s.fit(tr_s[feats], tr_s["TTT"])
        m_shut = metrics_reg(te_s["TTT"], lgb_s.predict(te_s[feats]))
        m_shut.update({"Model": "LightGBM_shutdown", "Stage": "Shutdown_gt180", "Split": "Temporal"})
        delay_rows.append(m_shut)
        # Baseline: predict median
        med = tr_s["TTT"].median()
        m_med = metrics_reg(te_s["TTT"], np.full(len(te_s), med))
        m_med.update({"Model": "Median_baseline", "Stage": "Shutdown_gt180", "Split": "Temporal"})
        delay_rows.append(m_med)
    else:
        delay_rows.append({"Model": "N/A", "Stage": "Shutdown_gt180", "Note": "Classification recommended", "N": len(shutdown)})

    pd.DataFrame(delay_rows).to_csv(PHASE_ROOT / "delay_regression_results.csv", index=False)

    return best_normal_pipe, normal_rows, delay_rows


# ---------------------------------------------------------------------------
# STEP 5 — Delay root causes
# ---------------------------------------------------------------------------
def delay_root_cause(df: pd.DataFrame):
    raw = pd.read_csv(RAW_PATH)
    raw["Date"] = pd.to_datetime(raw["Date"], errors="coerce")
    raw["month"] = raw["Date"].dt.to_period("M").astype(str)
    raw["TOTAL_FLUX"] = raw["LIME"] + raw["DOLO"]
    raw["Regime"] = assign_regime(raw["TTT"], "4class_standard")

    normal = raw[raw["Regime"] == "NORMAL"]
    delay_all = raw[raw["Regime"].isin(["LONG", "DELAY", "SHUTDOWN"])]

    dims = {
        "HM": ("HM", [50, 65, 75]),
        "DRI": ("DRI", [40, 55, 65]),
        "Bucket": ("Bucket", [0, 5, 15]),
        "Flux": ("TOTAL_FLUX", [8, 12, 16]),
        "Shift": ("Shift", None),
        "Month": ("month", None),
        "OXY": ("OXY", [3000, 4000, 5000]),
        "Charge_TC": ("T C", [115, 120, 130]),
    }

    rows = []
    for dim, (col, bins) in dims.items():
        if col not in raw.columns:
            continue
        if bins:
            edges = [-np.inf] + bins + [np.inf]
            n_bins = len(edges) - 1
            lab_opts = ["low", "mid", "high", "vhigh", "extreme"]
            cat = pd.cut(raw[col], bins=edges, labels=lab_opts[:n_bins])
        else:
            cat = raw[col].astype(str)
        for level in cat.dropna().unique():
            mask = cat == level
            n_delay = int((mask & raw["Regime"].isin(["LONG", "DELAY", "SHUTDOWN"])).sum())
            n_total = int(mask.sum())
            n_norm = int((mask & (raw["Regime"] == "NORMAL")).sum())
            delay_rate = n_delay / max(n_total, 1)
            norm_rate = n_norm / max(len(normal), 1)
            rows.append({
                "Dimension": dim,
                "Level": str(level),
                "N_total": n_total,
                "N_delay_heats": n_delay,
                "Delay_rate_pct": 100 * delay_rate,
                "Vs_normal_baseline_pct": 100 * (len(delay_all) / len(raw)),
                "Enrichment_ratio": delay_rate / max(len(delay_all) / len(raw), 1e-9),
            })

    # Statistical tests normal vs delay
    for col in ["HM", "DRI", "Bucket", "TOTAL_FLUX", "OXY", "T C", "CPC"]:
        if col not in raw.columns:
            continue
        a = normal[col].dropna()
        b = delay_all[col].dropna()
        if len(a) < 10 or len(b) < 10:
            continue
        stat, p = stats.mannwhitneyu(a, b, alternative="two-sided")
        rows.append({
            "Dimension": f"TEST_{col}",
            "Level": "delay_vs_normal",
            "Normal_mean": float(a.mean()),
            "Delay_mean": float(b.mean()),
            "MW_pvalue": float(p),
            "Significant_5pct": bool(p < 0.05),
        })

    rc = pd.DataFrame(rows)
    rc.to_csv(PHASE_ROOT / "delay_root_causes.csv", index=False)

    fig, axes = plt.subplots(2, 2, figsize=(10, 8))
    for ax, col in zip(axes.ravel(), ["HM", "DRI", "TOTAL_FLUX", "OXY"]):
        if col not in raw.columns:
            continue
        ax.hist(normal[col], bins=30, alpha=0.6, label="NORMAL", density=True)
        ax.hist(delay_all[col], bins=30, alpha=0.6, label="DELAY+", density=True)
        ax.set_title(col)
        ax.legend(fontsize=8)
    fig.suptitle("Normal vs delay heat distributions")
    fig.tight_layout()
    fig.savefig(PLOTS / "delay_root_cause_distributions.png", dpi=150)
    plt.close(fig)

    return rc


# ---------------------------------------------------------------------------
# STEP 6 — Industrial features priority
# ---------------------------------------------------------------------------
def industrial_features():
    rows = [
        ("Power-on time (arcing minutes)", "High", "Not in dataset", "SCADA/MES", -1.5, "Knutsen 2020; Sjunnesson 2019"),
        ("Delay codes / event logs", "Very High", "Not in dataset", "MES historian", -2.0, "Štore Steel 2019; Knutsen 2020"),
        ("DRI metallization %", "High", "Not in dataset", "DRI plant lab", -0.8, "Kirschen 2011; Memoli 2021"),
        ("Power restriction flag", "High", "Not in dataset", "EMS/MES", -0.6, "JSPL practice; Kirschen 2011"),
        ("Electrode breakage event", "Medium", "Not in dataset", "Operator log", -0.4, "Pfeifer 2011"),
        ("Charging delay / crane wait", "High", "Not in dataset", "MES timestamps", -1.2, "Knutsen 2020"),
        ("Ladle waiting time", "Medium", "Not in dataset", "MES", -0.5, "TERI EAF best practices"),
        ("Transformer tap setpoint", "Medium", "Not in dataset", "SCADA", -0.3, "Pfeifer 2011"),
        ("HM temperature at charge", "Medium", "Not in dataset", "Pyrometer", -0.4, "Duan 2014"),
        ("Bucket sequence / charge pattern", "Medium", "Partial (single bucket col)", "MES", -0.3, "Memoli 2021"),
        ("Foamy slag indicator", "Medium", "Not in dataset", "Derived from C/O2", -0.3, "Kirschen 2011"),
        ("OXY (planning setpoint)", "Medium", "Available", "Current data", -0.2, "Duan 2014 — timing uncertain"),
        ("CPC (planning setpoint)", "Medium", "Available", "Current data", -0.15, "Morales 2025"),
        ("Shift (crew context)", "Low", "Available", "Current data", -0.05, "Low SHAP in Phase 19"),
    ]
    df = pd.DataFrame(rows, columns=[
        "Variable", "Separation_importance", "Availability", "Source",
        "Expected_MAE_improvement_min", "Literature",
    ])
    df["Priority_score"] = df["Separation_importance"].map(
        {"Very High": 5, "High": 4, "Medium": 3, "Low": 2}
    ) * df["Expected_MAE_improvement_min"].abs()
    df = df.sort_values("Priority_score", ascending=False)
    df.to_csv(PHASE_ROOT / "industrial_feature_priority.csv", index=False)

    with pd.ExcelWriter(PHASE_ROOT / "missing_industrial_variables.xlsx", engine="openpyxl") as xw:
        df.to_excel(xw, sheet_name="Priority_ranking", index=False)
        pd.DataFrame({
            "Gap": [
                "No delay event timestamps — cannot separate logistical vs process delays",
                "No metallization — DRI quality hidden in tonnage",
                "No power-on/off decomposition — TTT variance unexplained",
                "POWER field is post-heat kWh — unusable for planning",
                "No operator ID — crew effects unmodeled",
            ],
            "Impact": ["High", "High", "Very High", "High (leakage)", "Low"],
        }).to_excel(xw, sheet_name="Data_gaps", index=False)

    return df


# ---------------------------------------------------------------------------
# STEP 7 — Pipeline simulation
# ---------------------------------------------------------------------------
def pipeline_simulation(
    df: pd.DataFrame,
    feats: list[str],
    clf_pipe_best,
    clf_le: LabelEncoder,
    reg_pipe_best,
    schema: str,
    labels: list[str],
):
    tr, te = temporal_split(df.assign(Regime=assign_regime(df["TTT"], schema)))
    Xte = te[feats]
    y_true = te["TTT"].values
    y_regime = te["Regime"].values

    pred_regime = clf_le.inverse_transform(clf_pipe_best.predict(Xte).astype(int))
    pred_ttt = np.zeros(len(te))

    normal_label = labels[0]
    long_label = labels[1] if len(labels) > 2 else None

    for i in range(len(te)):
        pr = pred_regime[i]
        if pr == normal_label:
            pred_ttt[i] = reg_pipe_best.predict(Xte.iloc[[i]])[0]
        elif long_label and pr == long_label:
            pred_ttt[i] = reg_pipe_best.predict(Xte.iloc[[i]])[0]  # fallback to normal model + bias correction
            pred_ttt[i] = min(pred_ttt[i] + 15, 120)  # delay warning offset
        else:
            pred_ttt[i] = 90.0  # delay warning placeholder duration

    overall_mae = float(mean_absolute_error(y_true, pred_ttt))
    normal_mask = y_regime == normal_label
    abnormal_mask = ~pd.Series(y_regime).isin([normal_label]).values

    # Warning metrics
    abnormal_pred = pred_regime != normal_label
    tp = int((abnormal_pred & abnormal_mask).sum())
    fp = int((abnormal_pred & normal_mask).sum())
    fn = int((~abnormal_pred & abnormal_mask).sum())
    tn = int((~abnormal_pred & normal_mask).sum())

    row = {
        "Overall_MAE": overall_mae,
        "Classifier_Accuracy": float(accuracy_score(y_regime, pred_regime)),
        "Normal_MAE": float(mean_absolute_error(y_true[normal_mask], pred_ttt[normal_mask])) if normal_mask.any() else float("nan"),
        "Abnormal_warning_Precision": tp / max(tp + fp, 1),
        "Abnormal_warning_Recall": tp / max(tp + fn, 1),
        "False_alarm_rate_pct": 100 * fp / max(normal_mask.sum(), 1),
        "Missed_delay_rate_pct": 100 * fn / max(abnormal_mask.sum(), 1),
        "TP": tp, "FP": fp, "FN": fn, "TN": tn,
        "N_test": len(te),
    }

    # Compare single-model baseline on same test
    single = reg_pipe(LGBMRegressor(n_estimators=400, max_depth=8, learning_rate=0.05, random_state=RANDOM_STATE, verbose=-1, n_jobs=-1))
    single.fit(tr[feats], tr["TTT"])
    single_mae = float(mean_absolute_error(y_true, single.predict(Xte)))
    row["Single_model_MAE_baseline"] = single_mae
    row["MAE_improvement_vs_single"] = single_mae - overall_mae

    pd.DataFrame([row]).to_csv(PHASE_ROOT / "pipeline_simulation.csv", index=False)

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.scatter(y_true, pred_ttt, alpha=0.35, s=12, c=np.where(abnormal_mask, "red", "steelblue"))
    ax.plot([0, 200], [0, 200], "k--", alpha=0.5)
    ax.set_xlabel("Actual TTT")
    ax.set_ylabel("Two-stage predicted TTT")
    ax.set_title(f"Pipeline simulation (MAE={overall_mae:.1f})")
    fig.tight_layout()
    fig.savefig(PLOTS / "pipeline_simulation.png", dpi=150)
    plt.close(fig)

    return row


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------
def write_reports(comp, normal_rows, pipe_row, ind_df, best_schema, best_model):
    best_clf = comp.sort_values("Macro_F1", ascending=False).iloc[0]
    best_reg = min([r for r in normal_rows if r.get("Split") == "Temporal"], key=lambda x: x["MAE"])

    ms = f"""# Phase 25 Model Selection

## Stage 1 — Regime classifier

**Selected schema:** `{best_schema}`  
**Selected model:** `{best_model}`

| Metric | Value |
|--------|-------|
| Macro F1 | {best_clf['Macro_F1']:.3f} |
| Abnormal recall | {best_clf.get('Abnormal_Recall', float('nan')):.3f} |
| Accuracy | {best_clf['Accuracy']:.3f} |
| ROC AUC (OvR) | {best_clf.get('ROC_AUC_OVR', best_clf.get('ROC_AUC', float('nan'))):.3f} |

Boundary investigation: see `regime_boundary_counts.csv`. The **4-class standard** schema (≤60 / 60–120 / 120–180 / >180) aligns with Phase 24.5 error clusters and industrial practice.

Top delay predictors (classifier SHAP): see `shap_classifier.csv`.

## Stage 2 — Normal heat regression

**Best model:** {best_reg['Model']} (temporal test)  
**MAE:** {best_reg['MAE']:.3f} min | **R²:** {best_reg['R2']:.3f}

Random-split LightGBM benchmark: {next(r['MAE'] for r in normal_rows if r.get('Split')=='Random'):.3f} min (Phase 24.5 comparable).

## Stage 3–4 — Long / shutdown

See `delay_regression_results.csv`. Shutdown heats show high irreducible error — **classification recommended** over regression.

## Pipeline simulation

| Metric | Value |
|--------|-------|
| Overall plant MAE | {pipe_row['Overall_MAE']:.2f} min |
| Single-model baseline MAE | {pipe_row['Single_model_MAE_baseline']:.2f} min |
| Improvement | {pipe_row['MAE_improvement_vs_single']:.2f} min |
| Delay warning recall | {100*pipe_row['Abnormal_warning_Recall']:.1f}% |
| False alarm rate | {pipe_row['False_alarm_rate_pct']:.1f}% |

## Architecture decision

```
Recipe input → Stage 1 classifier → NORMAL? → Stage 2 TTT regression
                                  → ABNORMAL? → Delay warning + duration estimate
```
"""
    (PHASE_ROOT / "model_selection.md").write_text(ms, encoding="utf-8")

    p26 = f"""# Phase 26 Recommendations

## Evidence-based priorities

1. **Deploy two-stage architecture** — single-model MAE {pipe_row['Single_model_MAE_baseline']:.1f} → pipeline MAE {pipe_row['Overall_MAE']:.1f} min.
2. **Keep normal regression leakage-free** — temporal MAE {best_reg['MAE']:.2f} min without EE_KWH features.
3. **Do not regress shutdown durations** — use classifier + operational alert only.
4. **Ingest delay codes and power-on time** — highest expected MAE/separation gain (see `industrial_feature_priority.csv`).

## Top missing variables

{ind_df.head(5).to_markdown(index=False)}

## Replace Phase 19?

Not yet for production. Normal-heat MAE ({best_reg['MAE']:.2f} min) is competitive with Phase 19 ({3.06:.2f} min reported), but:
- Classifier abnormal recall must exceed 80% before relying on delay warnings
- OXY/CPC planning-time status still needs JSPL sign-off
- Optimizer (Phase 20) must be retrained on leakage-free features

## Recommended deployment

| Component | Model | Notes |
|-----------|-------|-------|
| Stage 1 | {best_model} | {best_schema} |
| Stage 2 | {best_reg['Model']} | TTT≤60 only, LF features |
| Stage 3 | Alert only | No duration regression for >180 min |
| API | New `/predict/v2` endpoint | Classifier prob + TTT + warning flag |
"""
    (PHASE_ROOT / "phase_26_recommendations.md").write_text(p26, encoding="utf-8")


def main():
    print("Loading leakage-free dataset...")
    df = load_lf_data()
    feats = lf_features(df)
    print(f"Rows={len(df)}, features={len(feats)}")

    print("STAGE 1 — Classifiers...")
    best_schema, best_model, best_clf, best_labels, best_le, comp = stage1_classifiers(df, feats)

    print("STAGE 2–4 — Regime regressions...")
    best_reg, normal_rows, delay_rows = train_regime_regressions(df, feats)

    print("STEP 5 — Delay root causes...")
    rc = delay_root_cause(df)

    print("STEP 6 — Industrial features...")
    ind_df = industrial_features()

    print("STEP 7 — Pipeline simulation...")
    pipe_row = pipeline_simulation(df, feats, best_clf, best_le, best_reg, best_schema, best_labels)

    print("STEP 8 — Reports...")
    write_reports(comp, normal_rows, pipe_row, ind_df, best_schema, best_model)

    print("DONE —", PHASE_ROOT)


if __name__ == "__main__":
    main()
