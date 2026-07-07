"""
Phase 18 - Definitive Industrial Feature Set.

Corrects Phase 17 by never reintroducing multicollinear features after VIF
reduction. All final modeling subsets are drawn ONLY from the VIF-clean pool
(maximum VIF < 5).
"""

from __future__ import annotations

import logging
import math
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

import lightgbm as lgb
import matplotlib

matplotlib.use("Agg")

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import shap
import xgboost as xgb
from joblib import Memory, Parallel, delayed
from sklearn.ensemble import RandomForestRegressor
from sklearn.feature_selection import mutual_info_regression
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import make_scorer, mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_validate
from tabulate import tabulate
from tqdm import tqdm


RANDOM_SEED = 42
PHASE_ROOT = Path(__file__).resolve().parent
PLOTS_DIR = PHASE_ROOT / "plots"
EXPORTS_DIR = PHASE_ROOT / "exports"
CACHE_DIR = PHASE_ROOT / "cache"
MEMORY = Memory(location=CACHE_DIR, verbose=0)

PHASE17_DIR = PHASE_ROOT.parent / "phase_17_feature_selection"
PHASE16_DATASET = PHASE_ROOT.parent / "phase_16_feature_engineering" / "engineered_normal_ttt_dataset.csv"

ID_COL = "Heat Number"
DATE_COL = "Date"
TARGET = "TTT"
SHIFT_RAW = "Shift"
ORIGINAL_FEATURES = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "T C"]
ANALYSIS_ONLY_PATTERN = "ANALYSIS"

CORR_CLUSTER_THRESHOLD = 0.90
EXACT_DUP_THRESHOLD = 0.999999
VIF_MAX = 5.0
FINAL_SIZES = {"Minimal": 15, "Balanced": 25, "Research": 35}
STABILITY_RUNS = 100
STABILITY_TOP_K = 40
SHAP_SAMPLE_SIZE = 2500
PERMUTATION_REPEATS = 10
CV_FOLDS = 5
SAVE_DPI = 300

PRIORITY_ORDER = [
    "Raw variables",
    "Operational",
    "Ratios",
    "Burden",
    "Interactions",
    "Polynomial",
    "Shift",
]


def setup_logging() -> logging.Logger:
    for path in [PLOTS_DIR, EXPORTS_DIR, CACHE_DIR]:
        path.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    plt.rcParams.update(
        {
            "figure.figsize": (10, 6),
            "axes.grid": True,
            "grid.alpha": 0.25,
            "axes.titlesize": 14,
            "axes.labelsize": 12,
            "font.size": 10,
            "savefig.dpi": SAVE_DPI,
        }
    )
    np.random.seed(RANDOM_SEED)
    return logging.getLogger("phase_18")


LOGGER = setup_logging()
PIPELINE_START = time.perf_counter()


def section(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def print_table(rows: list[list[Any]], headers: list[str]) -> None:
    print(tabulate(rows, headers=headers, tablefmt="github", floatfmt=".4f"))


def save_plot(fig: plt.Figure, name: str) -> None:
    out = PLOTS_DIR / f"{name}.png"
    fig.tight_layout()
    fig.savefig(out, bbox_inches="tight", dpi=SAVE_DPI)
    plt.close(fig)
    LOGGER.info("Plot saved: %s", out)


def normalize_score(series: pd.Series) -> pd.Series:
    s = pd.to_numeric(series, errors="coerce")
    if s.notna().sum() == 0:
        return pd.Series(0.0, index=series.index)
    lo, hi = float(s.min()), float(s.max())
    if math.isclose(lo, hi):
        return pd.Series(0.0, index=series.index)
    return (s - lo) / (hi - lo)


def infer_category(feature: str) -> str:
    upper = feature.upper()
    if feature in ORIGINAL_FEATURES:
        return "Raw variables"
    if feature == SHIFT_RAW or upper.startswith("SHIFT_"):
        return "Shift"
    if upper.endswith("_SQ"):
        return "Polynomial"
    if "_X_" in upper:
        return "Interactions"
    if "RATIO" in upper:
        return "Ratios"
    if any(t in upper for t in ["BURDEN", "PCT", "SHARE", "DOMINANCE", "METALLIC"]):
        return "Burden"
    if any(t in upper for t in ["PER_TONNE", "DEVIATION", "INTENSITY", "BALANCE", "RANGE"]):
        return "Operational"
    return "Operational"


def priority_rank(feature: str) -> int:
    cat = infer_category(feature)
    try:
        return PRIORITY_ORDER.index(cat)
    except ValueError:
        return len(PRIORITY_ORDER)


def industrial_meaning(feature: str) -> str:
    meanings = {
        "HM": "Hot metal charge affecting liquid heat input.",
        "DRI": "Direct reduced iron solid burden.",
        "HBI": "Hot briquetted iron metallic input.",
        "Bucket": "Scrap bucket / scrap charging practice.",
        "LIME": "Lime flux for slag formation.",
        "DOLO": "Dolomite flux for slag and refractory protection.",
        "CPC": "Carbon injection practice.",
        "POWER": "Electrical energy delivered to the furnace.",
        "OXY": "Oxygen blowing intensity.",
        "T C": "Total charge size.",
        "OXY_X_POWER": "Combined oxygen-power operating intensity.",
        "POWER_PER_TONNE": "Specific electrical energy per tonne charged.",
        "OXYGEN_PER_TONNE": "Specific oxygen per tonne charged.",
    }
    if feature in meanings:
        return meanings[feature]
    cat = infer_category(feature)
    return f"{cat} indicator relevant to EAF tap-to-tap practice."


def is_analysis_only(col: str) -> bool:
    return ANALYSIS_ONLY_PATTERN in col.upper()


def compute_vif(df: pd.DataFrame) -> pd.Series:
    if df.shape[1] <= 1:
        return pd.Series({df.columns[0]: 1.0}) if df.shape[1] == 1 else pd.Series(dtype=float)
    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(df)
    vifs = {}
    for idx, col in enumerate(df.columns):
        y = X[:, idx]
        X_other = np.delete(X, idx, axis=1)
        if X_other.shape[1] == 0 or np.nanstd(y) == 0:
            vifs[col] = math.inf
            continue
        model = LinearRegression()
        model.fit(X_other, y)
        r2 = model.score(X_other, y)
        vifs[col] = math.inf if r2 >= 0.999999 else 1.0 / (1.0 - r2)
    return pd.Series(vifs)


def complete_linkage_clusters(corr: pd.DataFrame, threshold: float) -> list[list[str]]:
    remaining = sorted(
        corr.columns.tolist(),
        key=lambda f: (-float(corr.loc[f].drop(labels=[f], errors="ignore").mean()), f),
    )
    clusters: list[list[str]] = []
    while remaining:
        seed = remaining.pop(0)
        cluster = [seed]
        added = True
        while added:
            added = False
            for feat in remaining.copy():
                if all(float(corr.loc[feat, m]) >= threshold for m in cluster):
                    cluster.append(feat)
                    remaining.remove(feat)
                    added = True
        clusters.append(sorted(cluster))
    return clusters


def build_cluster_map(clusters: list[list[str]]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for idx, members in enumerate(clusters, start=1):
        for feat in members:
            mapping[feat] = idx
    return mapping


def parse_cluster_members(clusters_df: pd.DataFrame) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for _, row in clusters_df.iterrows():
        rep = row["Representative Feature"]
        members = [m.strip() for m in str(row["Cluster Members"]).split(",")]
        out[rep] = members
        for m in members:
            out.setdefault(m, members)
    return out


# ---------------------------------------------------------------------------
# STEP 1 - Load inputs
# ---------------------------------------------------------------------------


def step1_load_inputs() -> dict[str, Any]:
    section("STEP 1 - LOAD INPUTS")
    raw = pd.read_csv(PHASE16_DATASET, low_memory=False)
    excluded = {ID_COL, DATE_COL, TARGET, SHIFT_RAW}
    candidate_features = [c for c in raw.columns if c not in excluded and not is_analysis_only(c)]

    paths = {
        "feature_importance": PHASE17_DIR / "exports" / "feature_importance.csv",
        "vif_history": PHASE17_DIR / "exports" / "vif_history.csv",
        "correlation_clusters": PHASE17_DIR / "exports" / "correlation_clusters.csv",
        "stability": PHASE17_DIR / "tables" / "stability_selection.csv",
        "removed": PHASE17_DIR / "exports" / "removed_features.csv",
    }
    loaded = {k: pd.read_csv(p) if p.exists() else pd.DataFrame() for k, p in paths.items()}

    rows = [
        ["Engineered dataset rows", len(raw)],
        ["Candidate features", len(candidate_features)],
        ["Feature importance rows", len(loaded["feature_importance"])],
        ["VIF history rows", len(loaded["vif_history"])],
        ["Correlation clusters", len(loaded["correlation_clusters"])],
        ["Stability rows", len(loaded["stability"])],
        ["Removed feature log rows", len(loaded["removed"])],
    ]
    print_table(rows, ["Item", "Count"])

    return {
        "raw": raw,
        "candidate_features": candidate_features,
        **loaded,
    }


# ---------------------------------------------------------------------------
# STEP 2 - Master feature table
# ---------------------------------------------------------------------------


def step2_master_table(ctx: dict[str, Any]) -> pd.DataFrame:
    section("STEP 2 - MASTER FEATURE TABLE")
    raw = ctx["raw"]
    features = ctx["candidate_features"]
    imp = ctx["feature_importance"]
    stability = ctx["stability"]
    clusters_df = ctx["correlation_clusters"]

    y = pd.to_numeric(raw[TARGET], errors="coerce")
    numeric = raw[features].apply(pd.to_numeric, errors="coerce")
    vif_all = compute_vif(numeric)

    cluster_members: dict[str, list[str]] = {}
    if not clusters_df.empty:
        for _, row in clusters_df.iterrows():
            members = [m.strip() for m in str(row["Cluster Members"]).split(",")]
            cid = int(row["Cluster Number"])
            for m in members:
                cluster_members[m] = cid

    imp_idx = imp.set_index("Feature") if not imp.empty else pd.DataFrame()
    stab_idx = stability.set_index("Feature") if not stability.empty else pd.DataFrame()

    rows = []
    for feat in tqdm(features, desc="Building master table"):
        s = numeric[feat]
        pair = pd.concat([s, y], axis=1).dropna()
        pearson = float(pair.iloc[:, 0].corr(pair.iloc[:, 1])) if len(pair) >= 3 else math.nan
        mi = (
            float(mutual_info_regression(pair.iloc[:, [0]], pair.iloc[:, 1], random_state=RANDOM_SEED)[0])
            if len(pair) >= 3 and pair.iloc[:, 0].nunique() > 1
            else math.nan
        )
        rows.append(
            {
                "Feature": feat,
                "Category": infer_category(feat),
                "Correlation with target": pearson,
                "Mutual Information": mi,
                "Random Forest importance": float(imp_idx.loc[feat, "Random Forest Importance"]) if feat in imp_idx.index else math.nan,
                "LightGBM importance": math.nan,
                "SHAP importance": float(imp_idx.loc[feat, "SHAP Importance"]) if feat in imp_idx.index else math.nan,
                "Selection frequency": float(stab_idx.loc[feat, "Stability Score"]) if feat in stab_idx.index else 0.0,
                "Cluster ID": cluster_members.get(feat, np.nan),
                "Current VIF": float(vif_all.get(feat, math.nan)),
                "Missing %": float(s.isna().mean() * 100.0),
                "Industrial meaning": industrial_meaning(feat),
            }
        )

    master = pd.DataFrame(rows)
    master.to_csv(EXPORTS_DIR / "master_feature_table.csv", index=False)
    print_table(master.head(15).values.tolist(), master.head(15).columns.tolist())
    LOGGER.info("Master table saved with %s features", len(master))
    return master


# ---------------------------------------------------------------------------
# STEP 3 - Priority hierarchy (documented)
# ---------------------------------------------------------------------------


def step3_priority_hierarchy() -> None:
    section("STEP 3 - INDUSTRIAL PRIORITY HIERARCHY")
    rows = [[i + 1, cat] for i, cat in enumerate(PRIORITY_ORDER)]
    print_table(rows, ["Priority", "Category"])
    print(
        "\nRepresentative selection within correlated clusters uses:\n"
        "1. Industrial interpretability (priority above)\n"
        "2. Predictive importance (composite score when available)\n"
        "3. Lowest VIF\n"
        "4. Lowest missing %"
    )


# ---------------------------------------------------------------------------
# STEP 4 - Cluster representative selection
# ---------------------------------------------------------------------------


def step4_cluster_selection(
    ctx: dict[str, Any],
    master: pd.DataFrame,
) -> tuple[list[str], pd.DataFrame]:
    section("STEP 4 - CLUSTER REPRESENTATIVE SELECTION")
    raw = ctx["raw"]
    features = ctx["candidate_features"]

    # Remove exact duplicates first
    numeric = raw[features].apply(pd.to_numeric, errors="coerce")
    corr = numeric.corr().abs()
    exact_groups = complete_linkage_clusters(corr.fillna(0.0), EXACT_DUP_THRESHOLD)
    removed_exact: list[dict[str, str]] = []
    keep = set(features)
    for group in exact_groups:
        if len(group) <= 1:
            continue
        ranked = sorted(
            group,
            key=lambda f: (priority_rank(f), float(master.loc[master["Feature"] == f, "Current VIF"].iloc[0]) if f in master["Feature"].values else math.inf),
        )
        rep = ranked[0]
        for feat in group:
            if feat != rep:
                keep.discard(feat)
                removed_exact.append(
                    {
                        "Feature Removed": feat,
                        "Feature Kept": rep,
                        "Reason": f"Exact duplicate of {rep}; lower industrial priority or higher VIF.",
                    }
                )

    features_after_dup = sorted(keep)
    corr2 = numeric[features_after_dup].corr().abs()
    clusters = complete_linkage_clusters(corr2.fillna(0.0), CORR_CLUSTER_THRESHOLD)
    cluster_map = build_cluster_map(clusters)

    master_idx = master.set_index("Feature")
    selected: list[str] = []
    removal_log: list[dict[str, str]] = list(removed_exact)

    for cid, members in enumerate(clusters, start=1):
        if len(members) == 1:
            selected.append(members[0])
            continue

        def rank_key(f: str) -> tuple:
            row = master_idx.loc[f] if f in master_idx.index else None
            imp_score = -float(row["Random Forest importance"]) if row is not None and pd.notna(row["Random Forest importance"]) else 0.0
            vif = float(row["Current VIF"]) if row is not None and pd.notna(row["Current VIF"]) else math.inf
            miss = float(row["Missing %"]) if row is not None else math.inf
            return (priority_rank(f), imp_score, vif, miss, f)

        rep = sorted(members, key=rank_key)[0]
        selected.append(rep)
        for feat in members:
            if feat != rep:
                removal_log.append(
                    {
                        "Feature Removed": feat,
                        "Feature Kept": rep,
                        "Reason": f"Cluster {cid}: retained higher-priority / lower-VIF representative.",
                    }
                )

    log_df = pd.DataFrame(removal_log)
    log_df.to_csv(EXPORTS_DIR / "cluster_removal_log.csv", index=False)
    print(f"Features after duplicate removal: {len(features_after_dup)}")
    print(f"Cluster representatives retained: {len(selected)}")
    print_table(log_df.head(20).values.tolist(), log_df.head(20).columns.tolist())
    return selected, log_df


# ---------------------------------------------------------------------------
# STEP 5 - Iterative VIF reduction (max VIF < 5)
# ---------------------------------------------------------------------------


def step5_vif_reduction(raw: pd.DataFrame, features: list[str]) -> tuple[list[str], pd.DataFrame, pd.Series]:
    section("STEP 5 - ITERATIVE VIF REDUCTION (TARGET max VIF < 5)")
    current = features.copy()
    history: list[list[Any]] = []
    iteration = 0

    while True:
        vif = compute_vif(raw[current].apply(pd.to_numeric, errors="coerce"))
        max_feat = vif.idxmax()
        max_vif = float(vif.max())

        if max_vif < VIF_MAX:
            history.append([iteration, len(current), max_feat, max_vif, "", "Converged"])
            break

        def removal_key(f: str) -> tuple:
            is_raw = 0 if f in ORIGINAL_FEATURES else 1
            return (-float(vif[f]), is_raw, priority_rank(f), f)

        to_remove = sorted(current, key=removal_key)[0]
        reason = f"VIF={float(vif[to_remove]):.2f} exceeds {VIF_MAX}; removed as least essential redundant variable."
        history.append([iteration, len(current), max_feat, max_vif, to_remove, reason])
        current.remove(to_remove)
        iteration += 1
        if iteration > 200:
            raise RuntimeError("VIF reduction did not converge.")

    final_vif = compute_vif(raw[current].apply(pd.to_numeric, errors="coerce"))
    if float(final_vif.max()) >= VIF_MAX:
        raise RuntimeError(f"Final max VIF {final_vif.max():.2f} still exceeds {VIF_MAX}.")

    hist_df = pd.DataFrame(
        history,
        columns=["Iteration", "Feature Count", "Max VIF Feature", "Max VIF", "Feature Removed", "Reason"],
    )
    hist_df.to_csv(EXPORTS_DIR / "vif_reduction_history.csv", index=False)
    print_table(hist_df.tail(10).values.tolist(), hist_df.columns.tolist())
    print(f"\nVIF-clean pool: {len(current)} features, max VIF = {final_vif.max():.4f}")
    return current, hist_df, final_vif


# ---------------------------------------------------------------------------
# STEP 6 - Recompute importance on VIF-clean pool only
# ---------------------------------------------------------------------------


@MEMORY.cache
def _fit_reduced_importance(X_arr: np.ndarray, y_arr: np.ndarray, feature_names: tuple[str, ...]) -> pd.DataFrame:
    features = list(feature_names)
    X = pd.DataFrame(X_arr, columns=features)
    y = pd.Series(y_arr)

    rf = RandomForestRegressor(
        n_estimators=200, max_depth=14, min_samples_leaf=2, n_jobs=-1, random_state=RANDOM_SEED
    )
    lgbm = lgb.LGBMRegressor(
        n_estimators=200, learning_rate=0.05, num_leaves=31, random_state=RANDOM_SEED, verbosity=-1, n_jobs=-1
    )
    rf.fit(X, y)
    lgbm.fit(X, y)

    mi_vals = []
    for col in features:
        pair = pd.concat([X[col], y], axis=1).dropna()
        if len(pair) >= 3 and pair.iloc[:, 0].nunique() > 1:
            mi_vals.append(float(mutual_info_regression(pair.iloc[:, [0]], pair.iloc[:, 1], random_state=RANDOM_SEED)[0]))
        else:
            mi_vals.append(math.nan)

    sample_idx = np.random.default_rng(RANDOM_SEED).choice(len(X), size=min(SHAP_SAMPLE_SIZE, len(X)), replace=False)
    X_sample = X.iloc[sample_idx]
    explainer = shap.TreeExplainer(lgbm)
    shap_vals = explainer.shap_values(X_sample)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[0]
    shap_imp = np.abs(shap_vals).mean(axis=0)

    perm = permutation_importance(rf, X, y, n_repeats=PERMUTATION_REPEATS, random_state=RANDOM_SEED, n_jobs=-1)

    return pd.DataFrame(
        {
            "Feature": features,
            "Pearson": [float(X[c].corr(y)) for c in features],
            "Mutual Information": mi_vals,
            "Random Forest importance": rf.feature_importances_,
            "LightGBM importance": lgbm.feature_importances_,
            "SHAP importance": shap_imp,
            "Permutation importance": perm.importances_mean,
        }
    )


def step6_recompute_importance(raw: pd.DataFrame, vif_clean: list[str]) -> pd.DataFrame:
    section("STEP 6 - RECOMPUTE IMPORTANCE (VIF-CLEAN POOL ONLY)")
    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(raw[vif_clean].apply(pd.to_numeric, errors="coerce"))
    y = pd.to_numeric(raw[TARGET], errors="coerce").to_numpy()

    imp_df = _fit_reduced_importance(X, y, tuple(vif_clean))
    imp_df.to_csv(EXPORTS_DIR / "reduced_pool_importance.csv", index=False)
    print_table(imp_df.sort_values("Random Forest importance", ascending=False).head(15).values.tolist(), imp_df.columns.tolist())
    return imp_df


# ---------------------------------------------------------------------------
# STEP 7 - Stability selection on reduced pool
# ---------------------------------------------------------------------------


def _stability_single_run(
    X: np.ndarray, y: np.ndarray, features: list[str], seed: int, top_k: int
) -> tuple[Counter, dict[str, float]]:
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(X), size=len(X), replace=True)
    Xb, yb = X[idx], y[idx]
    rf = RandomForestRegressor(n_estimators=80, max_depth=12, min_samples_leaf=2, n_jobs=1, random_state=seed)
    rf.fit(Xb, yb)
    imp = pd.Series(rf.feature_importances_, index=features)
    top = imp.sort_values(ascending=False).head(min(top_k, len(features))).index.tolist()
    return Counter(top), dict(zip(features, rf.feature_importances_))


def step7_stability(raw: pd.DataFrame, vif_clean: list[str]) -> pd.DataFrame:
    section("STEP 7 - STABILITY SELECTION (VIF-CLEAN POOL)")
    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(raw[vif_clean].apply(pd.to_numeric, errors="coerce"))
    y = pd.to_numeric(raw[TARGET], errors="coerce").to_numpy()

    results = Parallel(n_jobs=-1)(
        delayed(_stability_single_run)(X, y, vif_clean, seed, STABILITY_TOP_K)
        for seed in tqdm(range(STABILITY_RUNS), desc="Stability bootstrap")
    )

    freq_total: Counter = Counter()
    imp_runs: dict[str, list[float]] = defaultdict(list)
    for freq, imp in results:
        freq_total.update(freq)
        for feat, val in imp.items():
            imp_runs[feat].append(float(val))

    rows = []
    for feat in vif_clean:
        rows.append(
            {
                "Feature": feat,
                "Selection frequency": freq_total[feat],
                "Stability score": freq_total[feat] / STABILITY_RUNS,
                "Mean importance": float(np.mean(imp_runs[feat])),
                "Std importance": float(np.std(imp_runs[feat])),
            }
        )
    stab_df = pd.DataFrame(rows).sort_values("Stability score", ascending=False)
    stab_df.to_csv(EXPORTS_DIR / "stability_reduced_pool.csv", index=False)
    print_table(stab_df.head(10).values.tolist(), stab_df.head(10).columns.tolist())
    return stab_df


# ---------------------------------------------------------------------------
# STEP 8 - Final ranking
# ---------------------------------------------------------------------------


def step8_final_ranking(imp_df: pd.DataFrame, stab_df: pd.DataFrame, final_vif: pd.Series) -> pd.DataFrame:
    section("STEP 8 - FINAL FEATURE RANKING")
    rank = imp_df.merge(stab_df[["Feature", "Stability score"]], on="Feature", how="left")
    rank["VIF"] = rank["Feature"].map(final_vif)
    rank["Category"] = rank["Feature"].map(infer_category)
    rank["Industrial meaning"] = rank["Feature"].map(industrial_meaning)

    weights = {
        "Pearson": 0.08,
        "Mutual Information": 0.12,
        "Permutation importance": 0.15,
        "Random Forest importance": 0.18,
        "LightGBM importance": 0.17,
        "SHAP importance": 0.18,
        "Stability score": 0.12,
    }
    for col in weights:
        rank[f"{col} norm"] = normalize_score(rank[col].abs() if col == "Pearson" else rank[col])

    rank["Final score"] = sum(rank[f"{c} norm"] * w for c, w in weights.items())
    rank = rank.sort_values("Final score", ascending=False).reset_index(drop=True)
    rank["Rank"] = np.arange(1, len(rank) + 1)
    rank.to_csv(EXPORTS_DIR / "feature_ranking.csv", index=False)
    print_table(rank.head(20)[["Rank", "Feature", "Category", "Final score", "VIF", "Stability score"]].values.tolist(),
                ["Rank", "Feature", "Category", "Final score", "VIF", "Stability score"])
    return rank


# ---------------------------------------------------------------------------
# STEP 9 - Three final datasets (subsets of VIF-clean pool)
# ---------------------------------------------------------------------------


def step9_final_datasets(rank: pd.DataFrame, vif_clean: list[str], raw: pd.DataFrame) -> dict[str, list[str]]:
    section("STEP 9 - FINAL FEATURE DATASETS")
    ordered = rank["Feature"].tolist()
    pool_set = set(vif_clean)

    datasets: dict[str, list[str]] = {}
    vif_checks: list[list[Any]] = []
    for name, size in FINAL_SIZES.items():
        chosen = [f for f in ordered if f in pool_set][:size]
        datasets[name] = chosen
        subset_vif = compute_vif(raw[chosen].apply(pd.to_numeric, errors="coerce"))
        max_vif = float(subset_vif.max()) if len(subset_vif) else 0.0
        if max_vif >= VIF_MAX:
            raise RuntimeError(f"{name} set max VIF {max_vif:.2f} exceeds limit {VIF_MAX}.")
        vif_checks.append([name, len(chosen), max_vif, "PASS"])
        pd.DataFrame({"Feature": chosen, "Category": [infer_category(f) for f in chosen]}).to_csv(
            EXPORTS_DIR / f"final_features_{size}.csv", index=False
        )
        LOGGER.info("%s set: %s features, max VIF=%.4f", name, len(chosen), max_vif)

    rows = [[k, len(v)] for k, v in datasets.items()]
    print_table(rows, ["Dataset", "Feature count"])
    print_table(vif_checks, ["Dataset", "N features", "Max VIF", "Status"])
    print("\nAll subsets verified: maximum VIF < 5.")
    return datasets

# ---------------------------------------------------------------------------
# STEP 10 - Baseline CV models
# ---------------------------------------------------------------------------


def _cv_one_model(X: np.ndarray, y: np.ndarray, model_name: str) -> dict[str, float]:
    if model_name == "RandomForest":
        model = RandomForestRegressor(n_estimators=150, max_depth=14, min_samples_leaf=2, n_jobs=-1, random_state=RANDOM_SEED)
    elif model_name == "LightGBM":
        model = lgb.LGBMRegressor(n_estimators=150, learning_rate=0.05, num_leaves=31, random_state=RANDOM_SEED, verbosity=-1, n_jobs=-1)
    else:
        model = xgb.XGBRegressor(n_estimators=150, learning_rate=0.05, max_depth=6, random_state=RANDOM_SEED, n_jobs=-1, verbosity=0)

    scoring = {
        "mae": make_scorer(mean_absolute_error, greater_is_better=False),
        "rmse": make_scorer(lambda yt, yp: math.sqrt(mean_squared_error(yt, yp)), greater_is_better=False),
        "r2": "r2",
    }
    cv = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_SEED)
    scores = cross_validate(model, X, y, cv=cv, scoring=scoring, n_jobs=-1)
    return {
        "MAE": float(-scores["test_mae"].mean()),
        "RMSE": float(-scores["test_rmse"].mean()),
        "R2": float(scores["test_r2"].mean()),
        "MAE_std": float(scores["test_mae"].std()),
    }


def step10_model_comparison(raw: pd.DataFrame, datasets: dict[str, list[str]]) -> pd.DataFrame:
    section("STEP 10 - BASELINE MODEL COMPARISON (5-FOLD CV)")
    y = pd.to_numeric(raw[TARGET], errors="coerce").to_numpy()
    rows = []

    for set_name, features in datasets.items():
        imputer = SimpleImputer(strategy="median")
        X = imputer.fit_transform(raw[features].apply(pd.to_numeric, errors="coerce"))
        for model_name in ["RandomForest", "LightGBM", "XGBoost"]:
            metrics = _cv_one_model(X, y, model_name)
            rows.append([set_name, len(features), model_name, metrics["MAE"], metrics["RMSE"], metrics["R2"], metrics["MAE_std"]])

    comp = pd.DataFrame(rows, columns=["Feature set", "N features", "Model", "MAE", "RMSE", "R2", "MAE_std"])
    comp.to_csv(EXPORTS_DIR / "model_comparison.csv", index=False)
    print_table(comp.values.tolist(), comp.columns.tolist())

    best = comp.sort_values(["MAE", "R2"], ascending=[True, False]).iloc[0]
    print(f"\nRecommended trade-off: {best['Feature set']} with {best['Model']} (MAE={best['MAE']:.3f}, R2={best['R2']:.3f})")
    return comp


# ---------------------------------------------------------------------------
# STEP 11 - Figures
# ---------------------------------------------------------------------------


def step11_plots(raw: pd.DataFrame, rank: pd.DataFrame, datasets: dict[str, list[str]], final_vif: pd.Series, stab_df: pd.DataFrame) -> None:
    section("STEP 11 - PUBLICATION FIGURES")

    top20 = rank.head(20)
    fig, ax = plt.subplots(figsize=(11, 8))
    ax.barh(top20["Feature"][::-1], top20["Final score"][::-1], color="#4C78A8")
    ax.set_title("Top 20 Final Features by Composite Score")
    ax.set_xlabel("Final score")
    save_plot(fig, "top20_final_features")

    balanced = datasets["Balanced"]
    corr = raw[balanced].apply(pd.to_numeric, errors="coerce").corr()
    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(corr, cmap="coolwarm", vmin=-1, vmax=1, ax=ax)
    ax.set_title("Correlation Heatmap - Balanced Feature Set")
    save_plot(fig, "correlation_heatmap_balanced")

    vif_plot = final_vif.sort_values(ascending=False)
    fig, ax = plt.subplots(figsize=(11, 7))
    ax.barh(vif_plot.index[::-1], vif_plot.values[::-1], color="#F58518")
    ax.axvline(VIF_MAX, color="red", linestyle="--", label=f"VIF limit = {VIF_MAX}")
    ax.set_title("VIF Distribution - VIF-Clean Pool")
    ax.legend()
    save_plot(fig, "vif_distribution")

    fig, ax = plt.subplots(figsize=(11, 7))
    top_stab = stab_df.head(20)
    ax.barh(top_stab["Feature"][::-1], top_stab["Stability score"][::-1], color="#54A24B")
    ax.set_title("Stability Selection - Top 20 Features")
    save_plot(fig, "stability_plot")

    cat_rows = []
    for name, feats in datasets.items():
        for f in feats:
            cat_rows.append({"Set": name, "Category": infer_category(f)})
    cat_df = pd.DataFrame(cat_rows)
    fig, ax = plt.subplots(figsize=(12, 6))
    sns.countplot(data=cat_df, x="Category", hue="Set", ax=ax)
    ax.tick_params(axis="x", rotation=45)
    ax.set_title("Feature Category Distribution by Final Set")
    save_plot(fig, "feature_category_distribution")

    comp = pd.read_csv(EXPORTS_DIR / "model_comparison.csv")
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    for ax, metric in zip(axes, ["MAE", "RMSE", "R2"]):
        pivot = comp.pivot(index="Feature set", columns="Model", values=metric)
        pivot.plot(kind="bar", ax=ax)
        ax.set_title(f"CV {metric}")
        ax.tick_params(axis="x", rotation=0)
    save_plot(fig, "model_comparison")

    # Multi-method importance heatmap (top 20)
    imp_cols = [
        "Pearson",
        "Mutual Information",
        "Permutation importance",
        "Random Forest importance",
        "LightGBM importance",
        "SHAP importance",
    ]
    imp_path = EXPORTS_DIR / "reduced_pool_importance.csv"
    if imp_path.exists():
        imp_plot = pd.read_csv(imp_path).set_index("Feature").loc[top20["Feature"], imp_cols]
        imp_norm = imp_plot.apply(lambda s: (s - s.min()) / (s.max() - s.min() + 1e-12))
        fig, ax = plt.subplots(figsize=(12, 8))
        sns.heatmap(imp_norm, cmap="YlOrRd", ax=ax, annot=False)
        ax.set_title("Feature Importance Heatmap (Normalized, Top 20)")
        save_plot(fig, "feature_importance_heatmap")

    # SHAP summary plot on Balanced set
    balanced_feats = datasets["Balanced"]
    imputer = SimpleImputer(strategy="median")
    X_bal = imputer.fit_transform(raw[balanced_feats].apply(pd.to_numeric, errors="coerce"))
    y_bal = pd.to_numeric(raw[TARGET], errors="coerce").to_numpy()
    sample_n = min(SHAP_SAMPLE_SIZE, len(X_bal))
    sample_idx = np.random.default_rng(RANDOM_SEED).choice(len(X_bal), size=sample_n, replace=False)
    lgbm_shap = lgb.LGBMRegressor(
        n_estimators=200, learning_rate=0.05, num_leaves=31, random_state=RANDOM_SEED, verbosity=-1, n_jobs=-1
    )
    lgbm_shap.fit(X_bal, y_bal)
    explainer = shap.TreeExplainer(lgbm_shap)
    shap_vals = explainer.shap_values(X_bal[sample_idx])
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[0]
    fig = plt.figure(figsize=(12, 8))
    shap.summary_plot(shap_vals, pd.DataFrame(X_bal[sample_idx], columns=balanced_feats), show=False, max_display=20)
    save_plot(fig, "shap_summary_balanced")


# ---------------------------------------------------------------------------
# STEP 12 - Summary export
# ---------------------------------------------------------------------------


def step12_summary(
    rank: pd.DataFrame,
    datasets: dict[str, list[str]],
    final_vif: pd.Series,
    comp: pd.DataFrame,
    vif_clean: list[str],
    removal_log: pd.DataFrame,
) -> None:
    section("STEP 12 - EXPORT SUMMARY")
    summary_rows = [
        ["VIF-clean pool size", len(vif_clean)],
        ["Maximum VIF", float(final_vif.max())],
        ["Minimal features", len(datasets["Minimal"])],
        ["Balanced features", len(datasets["Balanced"])],
        ["Research features", len(datasets["Research"])],
        ["Features removed for multicollinearity", len(removal_log)],
    ]
    summary = pd.DataFrame(summary_rows, columns=["Metric", "Value"])
    summary.to_csv(EXPORTS_DIR / "feature_selection_summary.csv", index=False)
    print_table(summary_rows, ["Metric", "Value"])


def final_banner(rank: pd.DataFrame, comp: pd.DataFrame, final_vif: pd.Series, datasets: dict[str, list[str]]) -> None:
    section("PHASE 18 COMPLETE")
    best = comp.sort_values(["MAE", "R2"], ascending=[True, False]).iloc[0]
    elapsed = time.perf_counter() - PIPELINE_START

    print(f"Maximum VIF: {float(final_vif.max()):.4f}")
    print(f"Final VIF-clean pool size: {len(final_vif)}")
    print(f"Best model: {best['Model']} on {best['Feature set']} set ({int(best['N features'])} features)")
    print(f"Cross-validation MAE: {best['MAE']:.4f} +/- {best['MAE_std']:.4f}")
    print(f"Cross-validation RMSE: {best['RMSE']:.4f}")
    print(f"Cross-validation R2: {best['R2']:.4f}")
    print("\nTop 20 final features:")
    print(", ".join(rank.head(20)["Feature"].tolist()))
    print(f"\nEstimated runtime: {elapsed / 60:.1f} minutes")
    print("\nCommand:")
    print("python research/phase_18_final_feature_selection/final_feature_selection.py")


def main() -> None:
    ctx = step1_load_inputs()
    step3_priority_hierarchy()
    master = step2_master_table(ctx)
    selected, removal_log = step4_cluster_selection(ctx, master)
    vif_clean, vif_hist, final_vif = step5_vif_reduction(ctx["raw"], selected)
    imp_df = step6_recompute_importance(ctx["raw"], vif_clean)
    stab_df = step7_stability(ctx["raw"], vif_clean)
    rank = step8_final_ranking(imp_df, stab_df, final_vif)
    datasets = step9_final_datasets(rank, vif_clean, ctx["raw"])
    comp = step10_model_comparison(ctx["raw"], datasets)
    step11_plots(ctx["raw"], rank, datasets, final_vif, stab_df)
    step12_summary(rank, datasets, final_vif, comp, vif_clean, removal_log)
    final_banner(rank, comp, final_vif, datasets)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        LOGGER.exception("Phase 18 failed: %s", exc)
        raise
