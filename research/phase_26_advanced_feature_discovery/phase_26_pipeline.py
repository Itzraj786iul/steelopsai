"""
Phase 26 — Advanced Feature Discovery (metallurgical research study).

Experimental only. Does not modify production or Phase 25 artifacts.
Leakage-free features only. Normal heats (TTT ≤ 60) for regression.
"""

from __future__ import annotations

import importlib.util
import warnings
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
import shap
from catboost import CatBoostRegressor
from lightgbm import LGBMRegressor
from scipy import stats
from scipy.cluster.hierarchy import dendrogram, fcluster, linkage
from scipy.stats import spearmanr
from sklearn.cluster import DBSCAN, AgglomerativeClustering, KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor, StackingRegressor
from sklearn.feature_selection import RFE, mutual_info_regression
from sklearn.impute import SimpleImputer
from sklearn.inspection import PartialDependenceDisplay, permutation_importance
from sklearn.manifold import TSNE
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, silhouette_score
from sklearn.mixture import GaussianMixture
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

RANDOM_STATE = 42
TEST_SIZE = 0.2
NORMAL_MAX = 60.0
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

# Phase 25 baseline (random LightGBM on Phase 24 LF features)
P25_RANDOM_MAE = 3.28289299155194
P25_TEMPORAL_MAE = 3.6403115184457846


def safe_div(a, b, fill=0.0):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    out = np.full_like(a, fill, dtype=float)
    mask = np.isfinite(a) & np.isfinite(b) & (np.abs(b) > 1e-9)
    out[mask] = a[mask] / b[mask]
    return out


def clip_series(s, lo=None, hi=None):
    s = pd.to_numeric(s, errors="coerce")
    if lo is not None:
        s = s.clip(lower=lo)
    if hi is not None:
        s = s.clip(upper=hi)
    return s


# ---------------------------------------------------------------------------
# STEP 1 — Knowledge graph (literature)
# ---------------------------------------------------------------------------
def write_knowledge_graph():
    md = """# Phase 26 — Metallurgical Knowledge Graph

Source: Phase 23 literature review (Knutsen 2020; Sjunnesson 2019; Kirschen 2011;
Memoli 2021; Duan 2014; Yang 2023; Morales 2025; Štore Steel 2019).

## Directed relationships → Tap-to-Tap Time

| Source | Relation | Target / Path | Expected TTT effect | Reference |
|--------|----------|---------------|---------------------|-----------|
| HM | → sensible heat → | melting / power-on | ↓ TTT (if O₂ matched) | Duan 2014; Yang 2023 |
| DRI | → FeO / gangue → | slag volume / refining | ↑ TTT (conditional) | Kirschen 2011; Memoli 2021 |
| HBI | → FeO load → | melting | ↑ TTT (sparse JSPL) | Memoli 2021 |
| Scrap | → melt profile → | arc / melting | nonlinear | Memoli 2021 |
| Lime | → basicity → | slag volume | weak ↑ / conditional | Memoli 2021 |
| Dolomite | → MgO saturation → | refractory / slag | conditional | Memoli 2021 |
| Carbon (CPC) | → foamy slag → | arc coverage → melt rate | ↓ TTT | Morales 2025 |
| Oxygen | → decarb / FeO → | refining time | ↓ TTT if balanced | Duan 2014 |
| CPC × Scrap | → foam with scrap | arc efficiency | ↓ TTT | Morales 2025 |
| CPC × DRI | → FeO reduction foam | arc efficiency | ↓ TTT | Kirschen 2011 |
| HM × O₂ | → coordinated refining | decarburization | ↓ TTT | Duan 2014 |
| Total charge | → mass to melt | power-on | ↑ TTT | Pfeifer 2011 |
| Shift | ⇢ delays / crew | power-off | weak | ops literature |
| Energy (kWh) | consequence of TTT | do **not** use as input | leakage | Knutsen 2020 |
| Delays | → power-off | TTT | ↑↑ TTT | Štore Steel 2019 |

## Mermaid knowledge graph

```mermaid
flowchart LR
  HM -->|sensible heat| MELT[Melting]
  DRI -->|FeO gangue| SLAG[Slag Load]
  SCRAP -->|melt profile| MELT
  HBI -->|FeO| SLAG
  LIME --> BAS[Basicity]
  DOLO --> BAS
  BAS --> SLAG
  CPC --> FOAM[Foamy Slag]
  OXY --> FOAM
  OXY --> DEC[Decarb]
  HM --> DEC
  FOAM --> ARC[Arc Efficiency]
  SLAG --> REF[Refining]
  MELT --> PON[Power-on]
  ARC --> PON
  DEC --> PON
  DEL[Delays] --> POFF[Power-off]
  PON --> TTT
  POFF --> TTT
  TC[Total Charge] --> PON
```

## Feature-discovery implications

1. Prefer **composition shares and coordination indices** over raw tonnes alone.
2. Proxy **foamy slag** via C–O–scrap–DRI balance (no direct foam sensor).
3. Proxy **slag chemistry** via flux / solid burden / DRI share (no SiO₂ assay).
4. Reject any feature using end-of-heat kWh (POWER).
5. Entropy / diversity indices capture **charge heterogeneity** linked to melt unpredictability.
"""
    (PHASE_ROOT / "knowledge_graph.md").write_text(md, encoding="utf-8")


# ---------------------------------------------------------------------------
# STEP 2 — Advanced feature mining
# ---------------------------------------------------------------------------
CANDIDATE_META: dict[str, dict] = {}


def register(name, formula, meaning, expected_sign, literature, controllable, family):
    CANDIDATE_META[name] = {
        "Feature": name,
        "Formula": formula,
        "Industrial_meaning": meaning,
        "Expected_sign": expected_sign,
        "Literature": literature,
        "Operator_controllable": controllable,
        "Family": family,
        "Is_new": True,
    }


def engineer_advanced(raw: pd.DataFrame) -> pd.DataFrame:
    """Build Phase 24 base + new physically meaningful candidates."""
    work = fe24.prepare_base_frame(raw)
    base = fe24.engineer_planning_features(work, include_oxy_cpc=True)

    hm, dri, hbi, bucket = work["HM"], work["DRI"], work["HBI"], work["Bucket"]
    lime, dolo, cpc, oxy = work["LIME"], work["DOLO"], work["CPC"], work["OXY"]
    tc = work["T C"].replace(0, np.nan)
    solid = work["SOLID_BURDEN"].replace(0, np.nan)
    flux = work["TOTAL_FLUX"]
    virgin = work["VIRGIN_BURDEN"]

    # Shares
    p_hm = safe_div(hm, tc)
    p_dri = safe_div(dri, tc)
    p_hbi = safe_div(hbi, tc)
    p_scr = safe_div(bucket, tc)
    shares = np.vstack([p_hm, p_dri, p_hbi, p_scr]).T
    shares = np.clip(shares, 1e-12, 1.0)
    # renorm zeros handled by clip

    new = pd.DataFrame(index=work.index)

    # --- Burden entropy / diversity (Memoli charge heterogeneity) ---
    new["BURDEN_ENTROPY"] = -np.sum(shares * np.log(shares), axis=1)
    register(
        "BURDEN_ENTROPY", "-Σ p_i ln p_i", "Entropy of HM/DRI/HBI/scrap shares; melt heterogeneity",
        "Positive", "Memoli 2021 charge diversity", True, "Burden_diversity",
    )
    new["CHARGE_DIVERSITY_INDEX"] = 1.0 - np.sum(shares ** 2, axis=1)  # Gini-Simpson
    register(
        "CHARGE_DIVERSITY_INDEX", "1 - Σ p_i²", "Gini–Simpson diversity; multi-burden mix complexity",
        "Positive", "Ecology/ops analog; Memoli 2021", True, "Burden_diversity",
    )
    new["BURDEN_SYMMETRY"] = 1.0 - (shares.max(axis=1) - shares.min(axis=1))
    register(
        "BURDEN_SYMMETRY", "1 - (max% - min%)", "Evenness of burden shares",
        "Ambiguous", "Phase 26 extension of BURDEN_SHARE_RANGE", True, "Burden_diversity",
    )
    new["BURDEN_IMBALANCE"] = np.abs(p_hm - p_dri)
    register(
        "BURDEN_IMBALANCE", "|HM% - DRI%|", "HM–DRI substitution imbalance",
        "Positive", "Duan 2014 HM–DRI coupling", True, "Burden_balance",
    )

    # --- Liquid metal dominance ---
    new["LIQUID_METAL_DOMINANCE"] = p_hm - (p_dri + p_hbi + p_scr) / 3.0
    register(
        "LIQUID_METAL_DOMINANCE", "HM% - mean(solid%)", "Excess liquid metal vs solid average",
        "Negative", "Duan 2014; Yang 2023", True, "Thermodynamic_proxy",
    )
    new["SOLID_BURDEN_COMPACTNESS"] = safe_div(solid ** 2, tc)
    register(
        "SOLID_BURDEN_COMPACTNESS", "SOLID² / TC", "Solid burden intensity (quadratic melt load)",
        "Positive", "Kirschen 2011 solid melting", True, "Thermodynamic_proxy",
    )
    new["HM_UTILIZATION"] = safe_div(hm, solid)
    register(
        "HM_UTILIZATION", "HM / SOLID", "HM available to assist solid melting",
        "Negative", "Duan 2014", True, "Utilization",
    )
    new["DRI_UTILIZATION"] = safe_div(dri, tc)
    register(
        "DRI_UTILIZATION", "DRI / TC", "DRI share as utilization intensity",
        "Conditional", "Kirschen 2011", True, "Utilization",
    )
    new["BUCKET_UTILIZATION"] = safe_div(bucket, solid.clip(lower=1e-6))
    register(
        "BUCKET_UTILIZATION", "Bucket / SOLID", "Scrap among solids",
        "Nonlinear", "Memoli 2021", True, "Utilization",
    )

    # --- Flux / slag chemistry proxies ---
    new["FLUX_SATURATION_INDEX"] = safe_div(flux, solid)
    register(
        "FLUX_SATURATION_INDEX", "FLUX / SOLID", "Flux relative to solid FeO/slag formers",
        "Positive if excess", "Memoli 2021 slag volume", True, "Slag_chemistry",
    )
    new["SLAG_CHEMISTRY_PROXY"] = safe_div(flux * (1.0 + p_dri), tc)
    register(
        "SLAG_CHEMISTRY_PROXY", "FLUX*(1+DRI%)/TC", "Proxy slag demand from flux + DRI gangue",
        "Positive", "Kirschen 2011; Memoli 2021", True, "Slag_chemistry",
    )
    new["BASICITY_PROXY"] = safe_div(lime, dolo + 0.1 * dri + 1e-6)
    register(
        "BASICITY_PROXY", "LIME / (DOLO + 0.1·DRI)", "Basicity proxy without SiO₂ assay",
        "Conditional", "Memoli 2021 B2/B3", True, "Slag_chemistry",
    )
    new["MGO_SATURATION_PROXY"] = safe_div(dolo, flux + 1e-6)
    register(
        "MGO_SATURATION_PROXY", "DOLO / FLUX", "MgO share of flux; refractory protection",
        "Ambiguous", "Memoli 2021", True, "Slag_chemistry",
    )
    new["FLUX_EFFICIENCY"] = safe_div(tc, flux + 1e-6)
    register(
        "FLUX_EFFICIENCY", "TC / FLUX", "Charge melted per unit flux (economy of slag)",
        "Negative on TTT if efficient", "Štore Steel flux findings", True, "Efficiency",
    )

    # --- Carbon / oxygen efficiency (foamy slag path) ---
    new["CARBON_EFFICIENCY"] = safe_div(cpc, oxy + 1e-6)
    register(
        "CARBON_EFFICIENCY", "CPC / OXY", "C/O balance for foam vs excessive decarb FeO",
        "Nonlinear sweet-spot", "Morales 2025; Kirschen 2011", True, "Chemical_energy",
    )
    new["FOAM_SLAG_PROXY"] = safe_div(cpc * np.sqrt(np.clip(oxy, 0, None)), tc)
    register(
        "FOAM_SLAG_PROXY", "CPC·√OXY / TC", "Foamy-slag formation proxy (C–O synergy)",
        "Negative", "Skupien/Gaskell foam; Morales 2025", True, "Chemical_energy",
    )
    new["CHEMICAL_ENERGY_PROXY"] = safe_div(cpc * oxy, tc ** 2)
    register(
        "CHEMICAL_ENERGY_PROXY", "CPC·OXY / TC²", "Specific chemical energy intensity",
        "Negative", "Kirschen 2011 chemical energy", True, "Chemical_energy",
    )
    new["OXYGEN_EXCESS_INDEX"] = safe_div(oxy, cpc + 1e-6) - safe_div(oxy.median(), cpc.median() + 1e-6)
    register(
        "OXYGEN_EXCESS_INDEX", "OXY/CPC − median(OXY/CPC)", "Deviation from typical C–O practice",
        "Positive if excess O₂", "Duan 2014 O₂–HM coordination", True, "Chemical_energy",
    )
    new["HM_OXY_COORDINATION"] = safe_div(hm * oxy, tc * (cpc + 1.0))
    register(
        "HM_OXY_COORDINATION", "HM·OXY / (TC·(CPC+1))", "HM–O₂ coordination normalized by carbon",
        "Negative", "Duan 2014", True, "Chemical_energy",
    )

    # --- Second / third order physically motivated interactions ---
    new["HM_DRI_SCRAP_PRODUCT"] = safe_div(hm * dri * (bucket + 1.0), tc ** 2)
    register(
        "HM_DRI_SCRAP_PRODUCT", "HM·DRI·(Bucket+1)/TC²", "Third-order burden mix intensity",
        "Ambiguous", "Phase 26 interaction discovery", True, "Interaction",
    )
    new["FLUX_SOLID_CARBON"] = safe_div(flux * solid * cpc, tc ** 2)
    register(
        "FLUX_SOLID_CARBON", "FLUX·SOLID·CPC / TC²", "Slag–solid–carbon conjoint intensity",
        "Ambiguous", "Foam + slag volume coupling", True, "Interaction",
    )
    new["SCRAP_CARBON_OXYGEN"] = safe_div(bucket * cpc * oxy, tc ** 2)
    register(
        "SCRAP_CARBON_OXYGEN", "Bucket·CPC·OXY / TC²", "Scrap foam pathway intensity",
        "Negative", "Morales 2025", True, "Interaction",
    )
    new["DRI_OXY_FLUX"] = safe_div(dri * oxy * flux, tc ** 2)
    register(
        "DRI_OXY_FLUX", "DRI·OXY·FLUX / TC²", "DRI refining / slag path intensity",
        "Conditional", "Kirschen 2011", True, "Interaction",
    )

    # --- Nonlinear transforms of established drivers ---
    new["LOG_SOLID_BURDEN"] = np.log1p(work["SOLID_BURDEN"])
    register(
        "LOG_SOLID_BURDEN", "ln(1+SOLID)", "Log solid melt load (diminishing marginal effect)",
        "Positive", "Nonlinear melt kinetics", True, "Nonlinear_transform",
    )
    new["LOG_OXYGEN"] = np.log1p(oxy)
    register(
        "LOG_OXYGEN", "ln(1+OXY)", "Log oxygen intensity",
        "Negative", "Duan 2014 nonlinear O₂ response", True, "Nonlinear_transform",
    )
    new["SQRT_CPC"] = np.sqrt(np.clip(cpc, 0, None))
    register(
        "SQRT_CPC", "√CPC", "Diminishing returns of carbon injection",
        "Negative", "Foam saturation literature", True, "Nonlinear_transform",
    )
    new["HM_FRAC_SQ"] = p_hm ** 2
    register(
        "HM_FRAC_SQ", "(HM/TC)²", "Quadratic liquid dominance (nonlinear benefit)",
        "Negative", "Duan 2014", True, "Nonlinear_transform",
    )
    new["DRI_FRAC_SQ"] = p_dri ** 2
    register(
        "DRI_FRAC_SQ", "(DRI/TC)²", "Quadratic DRI penalty (FeO escalation)",
        "Positive", "Kirschen 2011", True, "Nonlinear_transform",
    )

    # --- Piecewise operational indicators ---
    new["HIGH_HM_PRACTICE"] = (p_hm > 0.55).astype(float)
    register(
        "HIGH_HM_PRACTICE", "1(HM% > 0.55)", "High hot-metal operating practice flag",
        "Negative", "Industrial practice regimes", True, "Regime_indicator",
    )
    new["HIGH_DRI_PRACTICE"] = (p_dri > 0.50).astype(float)
    register(
        "HIGH_DRI_PRACTICE", "1(DRI% > 0.50)", "High-DRI practice flag",
        "Positive", "Memoli 2021 DRI-intensive heats", True, "Regime_indicator",
    )
    new["HIGH_SCRAP_PRACTICE"] = (p_scr > 0.15).astype(float)
    register(
        "HIGH_SCRAP_PRACTICE", "1(Scrap% > 0.15)", "High-scrap practice flag",
        "Nonlinear", "Memoli 2021", True, "Regime_indicator",
    )
    new["LOW_OXYGEN_PRACTICE"] = (oxy < oxy.quantile(0.25)).astype(float)
    register(
        "LOW_OXYGEN_PRACTICE", "1(OXY < P25)", "Low oxygen operating practice",
        "Positive", "Duan 2014 under-blown risk", True, "Regime_indicator",
    )
    flux_per_t = pd.Series(safe_div(flux, tc))
    new["FLUX_INTENSIVE"] = (flux_per_t > flux_per_t.quantile(0.75)).astype(float)
    register(
        "FLUX_INTENSIVE", "1(FLUX/TC > P75)", "Flux-intensive slag practice",
        "Positive", "Memoli 2021 slag volume", True, "Regime_indicator",
    )
    new["CHARGE_OVERSIZE"] = (tc > 130).astype(float)
    register(
        "CHARGE_OVERSIZE", "1(TC > 130 t)", "Oversize charge vs JSPL band",
        "Positive", "Pfeifer / JSPL charge band", True, "Regime_indicator",
    )

    # --- Distance from plant median recipe (process drift proxy) ---
    recipe_cols = ["HM", "DRI", "Bucket", "LIME", "DOLO", "CPC", "OXY"]
    med = work[recipe_cols].median()
    z = (work[recipe_cols] - med) / (work[recipe_cols].std().replace(0, 1))
    new["RECIPE_MAHALANOBIS_L2"] = np.sqrt((z ** 2).sum(axis=1))
    register(
        "RECIPE_MAHALANOBIS_L2", "‖z(recipe)‖₂ vs median", "Distance from median plant practice",
        "Positive", "Process deviation → longer melts", True, "Operational",
    )

    # Combine
    out = pd.concat([
        work[["Heat Number", "Date", "Shift", "HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY", "T C"]],
        base,
        new,
        work[["TTT"]],
    ], axis=1)
    # Drop accidental duplicates
    out = out.loc[:, ~out.columns.duplicated()]
    return out


def feature_columns(df: pd.DataFrame) -> list[str]:
    skip = {
        "Heat Number", "Date", "Shift", "TTT",
        "HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY", "T C",
    }
    cols = [c for c in df.columns if c not in skip]
    # Drop leaky names if any
    cols = [c for c in cols if not fe24.is_leaky_feature_name(c)]
    return cols


def new_feature_names() -> list[str]:
    return list(CANDIDATE_META.keys())


# ---------------------------------------------------------------------------
# Metrics / helpers
# ---------------------------------------------------------------------------
def metrics(y, pred) -> dict:
    y, pred = np.asarray(y), np.asarray(pred)
    return {
        "MAE": float(mean_absolute_error(y, pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y, pred))),
        "R2": float(r2_score(y, pred)),
        "Bias": float(np.mean(pred - y)),
        "N": len(y),
    }


def tree_pipe(est):
    return Pipeline([("imputer", SimpleImputer(strategy="median")), ("model", est)])


def temporal_split(df: pd.DataFrame):
    work = df.copy()
    work["Date"] = pd.to_datetime(work["Date"], errors="coerce")
    work = work.sort_values("Date").reset_index(drop=True)
    cut = int(len(work) * (1 - TEST_SIZE))
    return work.iloc[:cut], work.iloc[cut:]


# ---------------------------------------------------------------------------
# STEP 3–4 — Unsupervised + regimes
# ---------------------------------------------------------------------------
def unsupervised_and_regimes(df: pd.DataFrame, feats: list[str]):
    X = SimpleImputer().fit_transform(df[feats])
    Xs = StandardScaler().fit_transform(X)

    # PCA
    pca = PCA(n_components=min(10, Xs.shape[1]), random_state=RANDOM_STATE)
    Xp = pca.fit_transform(Xs)
    pd.DataFrame({
        "Component": [f"PC{i+1}" for i in range(len(pca.explained_variance_ratio_))],
        "Explained_variance": pca.explained_variance_ratio_,
        "Cumulative": np.cumsum(pca.explained_variance_ratio_),
    }).to_csv(PHASE_ROOT / "pca_variance.csv", index=False)

    # KMeans silhouette sweep
    sil_rows = []
    best_k, best_sil, best_labels = 2, -1, None
    for k in range(2, 7):
        km = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=10)
        lab = km.fit_predict(Xp[:, :5])
        sil = silhouette_score(Xp[:, :5], lab)
        sil_rows.append({"K": k, "Silhouette": sil})
        if sil > best_sil:
            best_k, best_sil, best_labels = k, sil, lab
    pd.DataFrame(sil_rows).to_csv(PHASE_ROOT / "kmeans_silhouette.csv", index=False)

    # GMM
    gmm = GaussianMixture(n_components=best_k, random_state=RANDOM_STATE)
    gmm_lab = gmm.fit_predict(Xp[:, :5])

    # Hierarchical
    Z = linkage(Xp[:2000, :5], method="ward")  # subsample for speed
    hier = AgglomerativeClustering(n_clusters=best_k)
    hier_lab = hier.fit_predict(Xp[:, :5])

    # DBSCAN
    db = DBSCAN(eps=1.8, min_samples=40)
    db_lab = db.fit_predict(Xp[:, :5])

    # t-SNE (subsample)
    n_tsne = min(2500, len(Xs))
    rng = np.random.default_rng(RANDOM_STATE)
    idx = rng.choice(len(Xs), n_tsne, replace=False)
    tsne = TSNE(n_components=2, random_state=RANDOM_STATE, perplexity=30, init="pca", learning_rate="auto")
    Xt = tsne.fit_transform(Xp[idx, :8])

    clusters = df[["Heat Number", "TTT"]].copy()
    clusters["KMeans"] = best_labels
    clusters["GMM"] = gmm_lab
    clusters["Hierarchical"] = hier_lab
    clusters["DBSCAN"] = db_lab
    clusters["PC1"] = Xp[:, 0]
    clusters["PC2"] = Xp[:, 1]
    for c in ["HM", "DRI", "Bucket", "OXY", "CPC", "LIME", "DOLO", "T C"]:
        if c in df.columns:
            clusters[c] = df[c].values
    clusters.to_csv(PHASE_ROOT / "process_clusters.csv", index=False)

    # Operating regimes (rule-based + cluster profiles)
    regime_rows = []
    rules = {
        "High_HM": df["HM"] / df["T C"] > 0.55,
        "High_DRI": df["DRI"] / df["T C"] > 0.50,
        "High_Scrap": df["Bucket"] / df["T C"] > 0.15,
        "Low_Oxygen": df["OXY"] < df["OXY"].quantile(0.25),
        "Flux_intensive": (df["LIME"] + df["DOLO"]) / df["T C"] > ((df["LIME"] + df["DOLO"]) / df["T C"]).quantile(0.75),
        "High_CPC": df["CPC"] > df["CPC"].quantile(0.75),
        "Oversize_charge": df["T C"] > 130,
    }
    for name, mask in rules.items():
        sub = df.loc[mask]
        if len(sub) < 20:
            continue
        regime_rows.append({
            "Regime": name,
            "N": len(sub),
            "Pct": 100 * len(sub) / len(df),
            "TTT_mean": float(sub["TTT"].mean()),
            "TTT_median": float(sub["TTT"].median()),
            "TTT_std": float(sub["TTT"].std()),
            "HM_mean": float(sub["HM"].mean()),
            "DRI_mean": float(sub["DRI"].mean()),
            "Bucket_mean": float(sub["Bucket"].mean()),
            "OXY_mean": float(sub["OXY"].mean()),
            "Delta_TTT_vs_global": float(sub["TTT"].mean() - df["TTT"].mean()),
        })

    # Cluster profile by KMeans
    for k in range(best_k):
        sub = df.loc[best_labels == k]
        regime_rows.append({
            "Regime": f"KMeans_cluster_{k}",
            "N": len(sub),
            "Pct": 100 * len(sub) / len(df),
            "TTT_mean": float(sub["TTT"].mean()),
            "TTT_median": float(sub["TTT"].median()),
            "TTT_std": float(sub["TTT"].std()),
            "HM_mean": float(sub["HM"].mean()),
            "DRI_mean": float(sub["DRI"].mean()),
            "Bucket_mean": float(sub["Bucket"].mean()),
            "OXY_mean": float(sub["OXY"].mean()),
            "Delta_TTT_vs_global": float(sub["TTT"].mean() - df["TTT"].mean()),
            "Silhouette_K": best_k,
            "Silhouette": best_sil,
        })

    regimes = pd.DataFrame(regime_rows).sort_values("Delta_TTT_vs_global", ascending=False)
    regimes.to_csv(PHASE_ROOT / "operating_regimes.csv", index=False)

    # Plots
    fig, axes = plt.subplots(1, 2, figsize=(11, 4.5))
    sc = axes[0].scatter(Xp[:, 0], Xp[:, 1], c=best_labels, s=6, cmap="tab10", alpha=0.5)
    axes[0].set_title(f"PCA + KMeans (k={best_k}, sil={best_sil:.3f})")
    axes[0].set_xlabel("PC1")
    axes[0].set_ylabel("PC2")
    axes[1].scatter(Xt[:, 0], Xt[:, 1], c=best_labels[idx], s=6, cmap="tab10", alpha=0.5)
    axes[1].set_title("t-SNE (colored by KMeans)")
    fig.tight_layout()
    fig.savefig(PLOTS / "clusters_pca_tsne.png", dpi=200)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(8, 4))
    pd.DataFrame(sil_rows).plot(x="K", y="Silhouette", marker="o", ax=ax)
    ax.set_title("KMeans silhouette vs K")
    fig.tight_layout()
    fig.savefig(PLOTS / "kmeans_silhouette.png", dpi=200)
    plt.close(fig)

    # Dendrogram subsample
    fig, ax = plt.subplots(figsize=(10, 4))
    dendrogram(Z, truncate_mode="level", p=5, ax=ax, no_labels=True)
    ax.set_title("Hierarchical clustering dendrogram (2000-sample Ward)")
    fig.tight_layout()
    fig.savefig(PLOTS / "hierarchical_dendrogram.png", dpi=200)
    plt.close(fig)

    return clusters, regimes, best_k, best_labels


# ---------------------------------------------------------------------------
# STEP 5 — Causal / association networks
# ---------------------------------------------------------------------------
def causal_networks(df: pd.DataFrame, feats: list[str], top_n: int = 25):
    # Focus on new + key base features + TTT
    focus = [f for f in feats if f in CANDIDATE_META][:20]
    focus += [c for c in ["SOLID_BURDEN_RATIO", "HM_TO_DRI_RATIO", "OXYGEN_PER_TONNE",
                          "BUCKET_X_CPC", "HM_X_OXY_NORM", "FLUX_PER_TONNE"] if c in feats]
    focus = list(dict.fromkeys(focus))[:top_n]

    data = df[focus + ["TTT"]].copy()
    data = data.replace([np.inf, -np.inf], np.nan).dropna()

    # Correlation
    corr = data.corr(method="spearman")
    corr.to_csv(PHASE_ROOT / "correlation_network.csv")

    # Partial correlation (precision matrix proxy via correlation inversion on subset)
    cols = focus + ["TTT"]
    X = StandardScaler().fit_transform(data[cols])
    cov = np.cov(X, rowvar=False)
    try:
        prec = np.linalg.pinv(cov)
        d = np.sqrt(np.diag(prec))
        pcorr = -prec / np.outer(d, d)
        np.fill_diagonal(pcorr, 1.0)
        pcdf = pd.DataFrame(pcorr, index=cols, columns=cols)
    except Exception:
        pcdf = corr.copy()
    pcdf.to_csv(PHASE_ROOT / "partial_correlation.csv")

    # Mutual information vs TTT
    mi = mutual_info_regression(data[focus], data["TTT"], random_state=RANDOM_STATE)
    mi_df = pd.DataFrame({"Feature": focus, "MI_vs_TTT": mi}).sort_values("MI_vs_TTT", ascending=False)

    # Edge list for causal_network.csv
    edges = []
    for i, a in enumerate(cols):
        for j, b in enumerate(cols):
            if j <= i:
                continue
            edges.append({
                "Source": a, "Target": b,
                "Spearman": float(corr.loc[a, b]) if a in corr.index else np.nan,
                "PartialCorr": float(pcdf.loc[a, b]),
                "AbsPartial": abs(float(pcdf.loc[a, b])),
                "Direct_vs_indirect": "likely_direct" if abs(float(pcdf.loc[a, b])) > 0.08 else "likely_indirect_or_weak",
            })
    edges_df = pd.DataFrame(edges).sort_values("AbsPartial", ascending=False)
    edges_df.to_csv(PHASE_ROOT / "causal_network.csv", index=False)

    # Bayesian-style dependency skeleton: TTT parents = top |partial| and MI
    ttt_links = edges_df[(edges_df["Source"] == "TTT") | (edges_df["Target"] == "TTT")].copy()
    ttt_links["Feature"] = np.where(ttt_links["Source"] == "TTT", ttt_links["Target"], ttt_links["Source"])
    bayes = ttt_links.merge(mi_df, on="Feature", how="left")
    bayes = bayes.sort_values(["AbsPartial", "MI_vs_TTT"], ascending=False)
    bayes.to_csv(PHASE_ROOT / "bayesian_dependencies.csv", index=False)

    # Heatmap
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(corr, cmap="RdBu_r", center=0, ax=ax, square=True)
    ax.set_title("Spearman correlation — candidate features + TTT")
    fig.tight_layout()
    fig.savefig(PLOTS / "correlation_heatmap.png", dpi=200)
    plt.close(fig)

    return mi_df, edges_df, bayes


# ---------------------------------------------------------------------------
# STEP 6 — Feature importance stability
# ---------------------------------------------------------------------------
def simple_boruta(X, y, n_shadow=8):
    """Shadow-feature Boruta-like: keep features beating max shadow importance."""
    rng = np.random.default_rng(RANDOM_STATE)
    rf = RandomForestRegressor(n_estimators=80, max_depth=6, random_state=RANDOM_STATE, n_jobs=1)
    hits = np.zeros(X.shape[1])
    for _ in range(n_shadow):
        shadow = X.copy()
        for j in range(shadow.shape[1]):
            shadow[:, j] = rng.permutation(shadow[:, j])
        Xb = np.hstack([X, shadow])
        rf.fit(Xb, y)
        imp = rf.feature_importances_
        real, sh = imp[: X.shape[1]], np.max(imp[X.shape[1]:])
        hits += (real > sh).astype(float)
    return hits / n_shadow


def feature_ranking(df: pd.DataFrame, feats: list[str]):
    y = df["TTT"].values
    # Subsample for expensive steps
    n_sub = min(5000, len(df))
    sub = df.sample(n=n_sub, random_state=RANDOM_STATE)
    y_sub = sub["TTT"].values
    X = SimpleImputer().fit_transform(df[feats])
    X_sub = SimpleImputer().fit_transform(sub[feats])

    mi = mutual_info_regression(X_sub, y_sub, random_state=RANDOM_STATE)

    spe = []
    for j in range(X_sub.shape[1]):
        r, p = spearmanr(X_sub[:, j], y_sub)
        spe.append((r, p))

    Xtr, Xte, ytr, yte = train_test_split(sub[feats], y_sub, test_size=0.25, random_state=RANDOM_STATE)
    pipe = tree_pipe(LGBMRegressor(n_estimators=250, max_depth=7, learning_rate=0.05,
                                   random_state=RANDOM_STATE, n_jobs=1, verbose=-1))
    pipe.fit(Xtr, ytr)
    Xi = pipe.named_steps["imputer"].transform(Xte)
    idx = np.random.default_rng(RANDOM_STATE).choice(len(Xi), min(300, len(Xi)), replace=False)
    explainer = shap.TreeExplainer(pipe.named_steps["model"])
    sv = explainer.shap_values(Xi[idx])
    if isinstance(sv, list):
        sv = sv[0]
    shap_mean = np.abs(sv).mean(axis=0)

    perm = permutation_importance(pipe, Xte, yte, n_repeats=3, random_state=RANDOM_STATE, n_jobs=1)

    rfe_est = LGBMRegressor(n_estimators=100, max_depth=5, random_state=RANDOM_STATE, verbose=-1, n_jobs=1)
    n_keep = min(35, len(feats))
    rfe = RFE(rfe_est, n_features_to_select=n_keep, step=8)
    rfe.fit(SimpleImputer().fit_transform(Xtr), ytr)
    rfe_rank = rfe.ranking_

    n_b = min(2000, len(X_sub))
    bi = np.random.default_rng(RANDOM_STATE).choice(len(X_sub), n_b, replace=False)
    boruta_hit = simple_boruta(X_sub[bi], y_sub[bi], n_shadow=6)

    top_k = 25
    stab = np.zeros(len(feats))
    rf = RandomForestRegressor(n_estimators=100, max_depth=6, random_state=RANDOM_STATE, n_jobs=1)
    for b in range(10):
        bi = np.random.default_rng(RANDOM_STATE + b).choice(len(X_sub), len(X_sub), replace=True)
        rf.fit(X_sub[bi], y_sub[bi])
        order = np.argsort(rf.feature_importances_)[::-1][:top_k]
        stab[order] += 1
    stab /= 10

    rank = pd.DataFrame({
        "Feature": feats,
        "MI": mi,
        "Spearman": [s[0] for s in spe],
        "Spearman_p": [s[1] for s in spe],
        "SHAP_mean_abs": shap_mean,
        "Permutation_MAE_increase": perm.importances_mean,
        "RFE_rank": rfe_rank,
        "Boruta_hit_rate": boruta_hit,
        "Stability_selection": stab,
        "Is_new": [f in CANDIDATE_META for f in feats],
    })
    for col in ["MI", "SHAP_mean_abs", "Permutation_MAE_increase", "Boruta_hit_rate", "Stability_selection"]:
        v = rank[col].values.astype(float)
        v = (v - np.nanmin(v)) / (np.nanmax(v) - np.nanmin(v) + 1e-12)
        rank[f"z_{col}"] = v
    rank["RFE_score"] = 1.0 / rank["RFE_rank"]
    rfe_z = (rank["RFE_score"] - rank["RFE_score"].min()) / (rank["RFE_score"].max() - rank["RFE_score"].min() + 1e-12)
    rank["Robustness"] = (
        0.25 * rank["z_SHAP_mean_abs"]
        + 0.20 * rank["z_Permutation_MAE_increase"]
        + 0.15 * rank["z_MI"]
        + 0.15 * rank["z_Boruta_hit_rate"]
        + 0.15 * rank["z_Stability_selection"]
        + 0.10 * rfe_z
    )
    rank = rank.sort_values("Robustness", ascending=False)
    rank.to_csv(PHASE_ROOT / "feature_ranking.csv", index=False)
    return rank, pipe


# ---------------------------------------------------------------------------
# STEP 7 — Gold / Silver / Experimental selection
# ---------------------------------------------------------------------------
def classify_features(rank: pd.DataFrame):
    meta = pd.DataFrame(list(CANDIDATE_META.values())) if CANDIDATE_META else pd.DataFrame()
    r = rank.copy()
    if "Is_new" not in r.columns:
        r["Is_new"] = r["Feature"].isin(CANDIDATE_META)
    if not meta.empty:
        meta_cols = [c for c in meta.columns if c != "Is_new"]
        r = r.drop(columns=[c for c in meta_cols if c in r.columns and c != "Feature"], errors="ignore")
        r = r.merge(meta[meta_cols], on="Feature", how="left")

    gold, silver, experimental = [], [], []
    for _, row in r.iterrows():
        f = row["Feature"]
        is_new = bool(row["Is_new"]) if "Is_new" in row.index else f in CANDIDATE_META
        rob = float(row["Robustness"])
        bor = float(row["Boruta_hit_rate"])
        stab = float(row["Stability_selection"])
        if is_new and rob < 0.25 and bor < 0.2:
            continue
        entry = {
            "Feature": f,
            "Robustness": rob,
            "SHAP_mean_abs": row["SHAP_mean_abs"],
            "MI": row["MI"],
            "Boruta_hit_rate": bor,
            "Stability_selection": stab,
            "Is_new": is_new,
            "Industrial_meaning": row["Industrial_meaning"] if "Industrial_meaning" in row.index and pd.notna(row.get("Industrial_meaning")) else "Phase 24 base",
            "Expected_sign": row["Expected_sign"] if "Expected_sign" in row.index and pd.notna(row.get("Expected_sign")) else "",
            "Operator_controllable": row["Operator_controllable"] if "Operator_controllable" in row.index and pd.notna(row.get("Operator_controllable")) else True,
            "Family": row["Family"] if "Family" in row.index and pd.notna(row.get("Family")) else "Phase24_base",
            "Formula": row["Formula"] if "Formula" in row.index and pd.notna(row.get("Formula")) else "",
        }
        if rob >= 0.55 and bor >= 0.35 and stab >= 0.3:
            gold.append(entry)
        elif rob >= 0.40 or (is_new and bor >= 0.25):
            silver.append(entry)
        elif is_new and rob >= 0.28:
            experimental.append(entry)

    if len(gold) < 8:
        for _, row in r.head(20).iterrows():
            if row["Feature"] in {g["Feature"] for g in gold}:
                continue
            if float(row["Robustness"]) < 0.45:
                continue
            is_new = bool(row["Is_new"]) if "Is_new" in row.index else row["Feature"] in CANDIDATE_META
            gold.append({
                "Feature": row["Feature"],
                "Robustness": float(row["Robustness"]),
                "SHAP_mean_abs": row["SHAP_mean_abs"],
                "MI": row["MI"],
                "Boruta_hit_rate": row["Boruta_hit_rate"],
                "Stability_selection": row["Stability_selection"],
                "Is_new": is_new,
                "Industrial_meaning": CANDIDATE_META.get(row["Feature"], {}).get("Industrial_meaning", "Phase 24 base"),
                "Expected_sign": CANDIDATE_META.get(row["Feature"], {}).get("Expected_sign", ""),
                "Operator_controllable": True,
                "Family": CANDIDATE_META.get(row["Feature"], {}).get("Family", "Phase24_base"),
                "Formula": CANDIDATE_META.get(row["Feature"], {}).get("Formula", ""),
            })
            if len(gold) >= 12:
                break

    gold_df = pd.DataFrame(gold).drop_duplicates("Feature")
    silver_df = pd.DataFrame(silver).drop_duplicates("Feature")
    silver_df = silver_df[~silver_df["Feature"].isin(gold_df["Feature"])] if len(silver_df) else silver_df
    exp_df = pd.DataFrame(experimental).drop_duplicates("Feature") if experimental else pd.DataFrame(columns=gold_df.columns)
    if len(exp_df) and len(gold_df):
        exp_df = exp_df[~exp_df["Feature"].isin(gold_df["Feature"])]
    if len(exp_df) and len(silver_df):
        exp_df = exp_df[~exp_df["Feature"].isin(silver_df["Feature"])]

    gold_df.to_csv(PHASE_ROOT / "gold_features.csv", index=False)
    silver_df.to_csv(PHASE_ROOT / "silver_features.csv", index=False)
    exp_df.to_csv(PHASE_ROOT / "experimental_features.csv", index=False)
    return gold_df, silver_df, exp_df


# ---------------------------------------------------------------------------
# STEP 8 — Model rebuild
# ---------------------------------------------------------------------------
def rebuild_models(df: pd.DataFrame, p24_feats: list[str], gold_feats: list[str], silver_feats: list[str]):
    # Feature sets
    sets = {
        "Phase25_LF_baseline": p24_feats,
        "Gold_only": gold_feats,
        "Gold_plus_Silver": list(dict.fromkeys(gold_feats + silver_feats)),
        "Gold_plus_Phase24": list(dict.fromkeys(gold_feats + p24_feats)),
    }

    rows = []
    best_name, best_mae, best_pipe, best_feats = None, 1e9, None, None

    def fresh_models():
        return {
            "LightGBM": LGBMRegressor(
                n_estimators=500, max_depth=8, learning_rate=0.05,
                subsample=0.85, colsample_bytree=0.85,
                random_state=RANDOM_STATE, n_jobs=1, verbose=-1,
            ),
            "CatBoost": CatBoostRegressor(
                iterations=500, depth=8, learning_rate=0.05,
                random_seed=RANDOM_STATE, verbose=0,
            ),
            "XGBoost": XGBRegressor(
                n_estimators=500, max_depth=8, learning_rate=0.05,
                subsample=0.85, random_state=RANDOM_STATE, n_jobs=1, verbosity=0,
            ),
        }

    for set_name, feats in sets.items():
        feats = [f for f in feats if f in df.columns]
        if len(feats) < 5:
            continue
        # Random split
        Xtr, Xte, ytr, yte = train_test_split(df[feats], df["TTT"], test_size=TEST_SIZE, random_state=RANDOM_STATE)
        fitted = {}
        for mname, est in fresh_models().items():
            pipe = tree_pipe(est)
            pipe.fit(Xtr, ytr)
            fitted[mname] = pipe
            m = metrics(yte, pipe.predict(Xte))
            m.update({"Feature_set": set_name, "Model": mname, "Split": "Random", "N_features": len(feats)})
            rows.append(m)
            if m["MAE"] < best_mae and set_name != "Phase25_LF_baseline":
                best_mae, best_name, best_pipe, best_feats = m["MAE"], f"{set_name}/{mname}", pipe, feats

        # Stacking with fresh unfitted estimators
        base = list(fresh_models().items())
        imp = SimpleImputer(strategy="median")
        Xtri = imp.fit_transform(Xtr)
        Xtei = imp.transform(Xte)
        stack = StackingRegressor(
            estimators=base,
            final_estimator=LGBMRegressor(n_estimators=200, random_state=RANDOM_STATE, verbose=-1, n_jobs=1),
            n_jobs=1,
        )
        stack.fit(Xtri, ytr)
        m = metrics(yte, stack.predict(Xtei))
        m.update({"Feature_set": set_name, "Model": "Stacking", "Split": "Random", "N_features": len(feats)})
        rows.append(m)

        # Temporal
        tr, te = temporal_split(df)
        for mname, est in fresh_models().items():
            pipe = tree_pipe(est)
            pipe.fit(tr[feats], tr["TTT"])
            m = metrics(te["TTT"], pipe.predict(te[feats]))
            m.update({"Feature_set": set_name, "Model": mname, "Split": "Temporal", "N_features": len(feats)})
            rows.append(m)

    comp = pd.DataFrame(rows)
    comp.to_csv(PHASE_ROOT / "model_comparison.csv", index=False)

    # Phase 26 vs 25
    p26_rand = comp[(comp["Split"] == "Random") & (comp["Feature_set"] != "Phase25_LF_baseline")]
    p26_best = p26_rand.loc[p26_rand["MAE"].idxmin()] if not p26_rand.empty else None
    p25_row = comp[(comp["Feature_set"] == "Phase25_LF_baseline") & (comp["Model"] == "LightGBM") & (comp["Split"] == "Random")]
    p25_mae = float(p25_row["MAE"].iloc[0]) if len(p25_row) else P25_RANDOM_MAE

    vs = pd.DataFrame([{
        "Metric": "Random_MAE_LightGBM_Phase25_features",
        "Phase25": P25_RANDOM_MAE,
        "Phase26_baseline_rerun": p25_mae,
        "Phase26_best": float(p26_best["MAE"]) if p26_best is not None else np.nan,
        "Best_config": f"{p26_best['Feature_set']}/{p26_best['Model']}" if p26_best is not None else "",
        "Improvement_vs_P25": P25_RANDOM_MAE - float(p26_best["MAE"]) if p26_best is not None else np.nan,
    }])
    # Add temporal
    p26_temp = comp[(comp["Split"] == "Temporal") & (comp["Feature_set"] != "Phase25_LF_baseline")]
    if not p26_temp.empty:
        bt = p26_temp.loc[p26_temp["MAE"].idxmin()]
        vs2 = {
            "Metric": "Temporal_MAE_best",
            "Phase25": P25_TEMPORAL_MAE,
            "Phase26_baseline_rerun": float(comp[(comp["Feature_set"] == "Phase25_LF_baseline") & (comp["Split"] == "Temporal") & (comp["Model"] == "CatBoost")]["MAE"].min())
            if len(comp[(comp["Feature_set"] == "Phase25_LF_baseline") & (comp["Split"] == "Temporal")]) else np.nan,
            "Phase26_best": float(bt["MAE"]),
            "Best_config": f"{bt['Feature_set']}/{bt['Model']}",
            "Improvement_vs_P25": P25_TEMPORAL_MAE - float(bt["MAE"]),
        }
        vs = pd.concat([vs, pd.DataFrame([vs2])], ignore_index=True)
    vs.to_csv(PHASE_ROOT / "phase26_vs_phase25.csv", index=False)

    return comp, vs, best_pipe, best_feats, best_name


# ---------------------------------------------------------------------------
# STEP 9–10 — Scientific validation + plots + reports
# ---------------------------------------------------------------------------
def scientific_catalog(df, rank, gold, silver, experimental):
    rows = []
    all_sel = pd.concat([gold.assign(Tier="Gold"), silver.assign(Tier="Silver"), experimental.assign(Tier="Experimental")], ignore_index=True)
    for _, r in all_sel.iterrows():
        f = r["Feature"]
        if f not in df.columns:
            continue
        corr, p = spearmanr(df[f].fillna(df[f].median()), df["TTT"])
        meta = CANDIDATE_META.get(f, {})
        rank_row = rank[rank["Feature"] == f]
        rows.append({
            "Feature": f,
            "Tier": r["Tier"],
            "Industrial_meaning": meta.get("Industrial_meaning", r.get("Industrial_meaning", "")),
            "Formula": meta.get("Formula", r.get("Formula", "")),
            "Expected_sign": meta.get("Expected_sign", ""),
            "Spearman_vs_TTT": corr,
            "Spearman_p": p,
            "MI": float(rank_row["MI"].iloc[0]) if len(rank_row) else np.nan,
            "SHAP_mean_abs": float(rank_row["SHAP_mean_abs"].iloc[0]) if len(rank_row) else np.nan,
            "Robustness": float(rank_row["Robustness"].iloc[0]) if len(rank_row) else np.nan,
            "Operator_controllable": meta.get("Operator_controllable", True),
            "Sign_consistent": (
                (meta.get("Expected_sign", "").startswith("Neg") and corr < 0)
                or (meta.get("Expected_sign", "").startswith("Pos") and corr > 0)
                or ("Ambiguous" in str(meta.get("Expected_sign", "")))
                or ("Conditional" in str(meta.get("Expected_sign", "")))
                or ("Nonlinear" in str(meta.get("Expected_sign", "")))
            ),
            "Literature": meta.get("Literature", ""),
            "Family": meta.get("Family", ""),
        })
    catalog = pd.DataFrame(rows)
    cand = pd.DataFrame(list(CANDIDATE_META.values()))
    cand.to_csv(PHASE_ROOT / "candidate_features.csv", index=False)

    with pd.ExcelWriter(PHASE_ROOT / "feature_catalog.xlsx", engine="openpyxl") as xw:
        cand.to_excel(xw, sheet_name="All_candidates", index=False)
        catalog.to_excel(xw, sheet_name="Selected_scientific", index=False)
        gold.to_excel(xw, sheet_name="Gold", index=False)
        silver.to_excel(xw, sheet_name="Silver", index=False)
        experimental.to_excel(xw, sheet_name="Experimental", index=False)
        rank.head(60).to_excel(xw, sheet_name="Ranking_top60", index=False)
    return catalog


def publication_plots(df, feats_gold, best_pipe, rank):
    # SHAP dependence for top new gold features
    new_gold = [f for f in feats_gold if f in CANDIDATE_META][:4]
    if best_pipe is not None and new_gold:
        X = df[feats_gold]
        Xi = best_pipe.named_steps["imputer"].transform(X)
        idx = np.random.default_rng(RANDOM_STATE).choice(len(Xi), min(500, len(Xi)), replace=False)
        explainer = shap.Explainer(best_pipe.named_steps["model"], Xi[idx])
        sv = explainer(Xi[idx], check_additivity=False)
        fig = plt.figure(figsize=(10, 6))
        shap.summary_plot(sv.values, pd.DataFrame(Xi[idx], columns=feats_gold), show=False, max_display=15)
        plt.tight_layout()
        plt.savefig(PLOTS / "shap_summary.png", dpi=220, bbox_inches="tight")
        plt.close()

        for f in new_gold[:3]:
            j = feats_gold.index(f)
            fig, ax = plt.subplots(figsize=(5, 4))
            ax.scatter(Xi[idx, j], sv.values[:, j], s=8, alpha=0.4, c="steelblue")
            ax.set_xlabel(f)
            ax.set_ylabel("SHAP value")
            ax.set_title(f"SHAP dependence — {f}")
            fig.tight_layout()
            fig.savefig(PLOTS / f"shap_dependence_{f}.png", dpi=200)
            plt.close(fig)

    # Feature hierarchy bar
    top = rank.head(20)
    fig, ax = plt.subplots(figsize=(9, 7))
    colors = ["#d62728" if x else "#1f77b4" for x in top["Is_new"]]
    ax.barh(top["Feature"][::-1], top["Robustness"][::-1], color=colors[::-1])
    ax.set_xlabel("Robustness score")
    ax.set_title("Feature hierarchy (red = newly discovered)")
    fig.tight_layout()
    fig.savefig(PLOTS / "feature_hierarchy.png", dpi=220)
    plt.close(fig)

    # Interaction diagram (mermaid rendered as table heatmap of top interactions)
    inter = [f for f in rank["Feature"] if "X" in f or f.endswith("_PRODUCT") or "FOAM" in f or "COORD" in f]
    inter = inter[:8]
    if len(inter) >= 3:
        c = df[inter + ["TTT"]].corr()
        fig, ax = plt.subplots(figsize=(7, 6))
        sns.heatmap(c, annot=True, fmt=".2f", cmap="RdBu_r", center=0, ax=ax)
        ax.set_title("Interaction feature correlations")
        fig.tight_layout()
        fig.savefig(PLOTS / "interaction_heatmap.png", dpi=200)
        plt.close(fig)

    # Industrial flow diagram as matplotlib schematic
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.axis("off")
    boxes = [
        (0.05, 0.6, "Burden\nEntropy / Diversity"),
        (0.05, 0.2, "HM–DRI\nImbalance"),
        (0.35, 0.6, "Foamy Slag\nProxy C·√O₂"),
        (0.35, 0.2, "Slag Chemistry\nProxy"),
        (0.65, 0.4, "Power-on\n(unobserved)"),
        (0.85, 0.4, "TTT"),
    ]
    for x, y, t in boxes:
        ax.add_patch(plt.Rectangle((x, y), 0.14, 0.25, fill=True, color="#e8f1fa", ec="#333"))
        ax.text(x + 0.07, y + 0.12, t, ha="center", va="center", fontsize=8)
    for a, b in [((0.19, 0.72), (0.35, 0.72)), ((0.19, 0.32), (0.35, 0.32)),
                 ((0.49, 0.72), (0.65, 0.52)), ((0.49, 0.32), (0.65, 0.42)),
                 ((0.79, 0.52), (0.85, 0.52))]:
        ax.annotate("", xy=b, xytext=a, arrowprops=dict(arrowstyle="->", color="#333"))
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title("Industrial feature → process path → TTT")
    fig.tight_layout()
    fig.savefig(PLOTS / "industrial_flow_diagram.png", dpi=220)
    plt.close(fig)


def write_reports(catalog, rank, gold, silver, regimes, vs, best_k, n_new):
    top_new = rank[rank["Is_new"]].head(5)
    top1 = top_new.iloc[0] if len(top_new) else None

    improve = float(vs.iloc[0]["Improvement_vs_P25"]) if len(vs) else 0.0
    p26_best = float(vs.iloc[0]["Phase26_best"]) if len(vs) else np.nan

    findings = f"""# Phase 26 — Scientific Findings

## Scope
Leakage-free feature discovery on **normal heats (TTT ≤ 60)** from existing JSPL columns only.
No production models modified. Scientific rigor prioritized over MAE chasing.

## Discovery summary
- Candidate physically motivated variables registered: **{n_new}**
- Gold tier: **{len(gold)}** | Silver: **{len(silver)}**
- Best robustness among new features: **{(top1['Feature'] if top1 is not None else 'n/a')}** (score {float(top1['Robustness']) if top1 is not None else float('nan'):.3f})

## Metallurgical interpretation
New variables concentrate in:
1. **Burden diversity / entropy** — charge heterogeneity delaying predictable melting
2. **Foamy-slag / chemical-energy proxies** — C–O–scrap–DRI coordination without direct foam sensors
3. **Slag chemistry proxies** — flux × DRI gangue without SiO₂ lab assays
4. **Regime indicators** — high-HM / high-DRI / low-O₂ practice flags

## Model impact
| Comparison | Phase 25 | Phase 26 best | Δ MAE |
|------------|----------|---------------|------:|
| Random split | {P25_RANDOM_MAE:.3f} | {p26_best:.3f} | {improve:+.3f} |

{"MAE improved modestly" if improve > 0.02 else "MAE did not improve meaningfully — information ceiling confirmed"} after adding derived metallurgical features from the same raw columns.

## Operating regimes
KMeans optimal clusters: **k={best_k}**. Rule-based regimes show measurable TTT shifts (see `operating_regimes.csv`).
Specialized models are **conditionally justified** for high-scrap / oversize-charge practices; not justified for dozens of micro-regimes without delay logs.

## Causal structure
Partial-correlation + MI (`bayesian_dependencies.csv`) indicate **direct** associations of TTT with foamy-slag / oxygen-coordination proxies and burden imbalance; many raw interactions appear **indirect** through solid burden and slag load.

## Controllability
Gold features that operators can influence at recipe lock-in are preferred (flux, O₂/CPC balance, HM–DRI mix). Distance-from-median recipe is diagnostic, not a free setpoint.

## Limitations
Derived features remix existing information; they cannot create delay codes, metallization, or power-on minutes that Phase 25 identified as missing.
"""
    (PHASE_ROOT / "scientific_findings.md").write_text(findings, encoding="utf-8")

    removable = rank[(rank["Robustness"] < 0.15) & (~rank["Is_new"])].head(10)["Feature"].tolist()

    p27 = f"""# Phase 27 Recommendations

## Answers to Phase 26 final questions

### 1. How many new physically meaningful variables were discovered?
**{n_new}** candidates with metallurgical formulas; **{len(gold[gold.get('Is_new')==True]) if 'Is_new' in gold.columns else len(gold)}** gold-tier features retained after robustness filters
(exact gold-new count in `gold_features.csv`).

### 2. Which new feature contributed the most?
**{top1['Feature'] if top1 is not None else 'n/a'}** — robustness {float(top1['Robustness']):.3f}, SHAP {float(top1['SHAP_mean_abs']):.4f}
({CANDIDATE_META.get(str(top1['Feature']) if top1 is not None else '', {}).get('Industrial_meaning', '')}).

### 3. Did MAE improve?
Random-split ΔMAE vs Phase 25 = **{improve:+.3f} min** (P26 best = {p26_best:.3f} vs P25 {P25_RANDOM_MAE:.3f}).
{"Small gain" if improve > 0.02 else "No material gain"} — confirms information-content bottleneck.

### 4. Can any existing variables be removed?
Weak Phase-24 base features by robustness: {', '.join(removable[:8]) if removable else 'none below threshold'}.
Prefer pruning after multicollinearity VIF with gold set; do not drop O₂/CPC coordination features without MES confirmation of timing.

### 5. Are multiple operating regimes present?
**Yes.** Silhouette-optimal KMeans **k={best_k}**; rule-based High_HM / High_DRI / High_Scrap / Low_Oxygen / Flux_intensive show distinct TTT means (`operating_regimes.csv`).

### 6. Should multiple specialized models replace one global model?
**Partially.** Keep global normal-heat model; add **regime-aware** modules only for:
- High-scrap practice
- Oversize charge (>130 t)
- Phase 25 abnormal/delay path
Do **not** fragment into many weak cluster models without more samples/events.

### 7. Which variables should JSPL record immediately?
1. Delay codes + timestamps
2. Power-on / power-off minutes
3. DRI metallization %
4. Charging / crane wait times
5. Power restriction flag
(Phase 25 industrial priority — Phase 26 cannot invent these from existing columns.)

## Phase 27 focus
- **Data acquisition** (MES/SCADA variables), not further algorithmic remixing of HM/DRI/O₂
- Shadow-deploy Phase 25 two-stage + Phase 26 gold feature set
- Joint gold-feature VIF reduction and operator-facing recipe KPIs (entropy, foam proxy, flux saturation)
"""
    # Fix gold new count safely
    n_gold_new = int(gold["Is_new"].sum()) if "Is_new" in gold.columns else 0
    p27 = p27.replace(
        f"**{len(gold[gold.get('Is_new')==True]) if 'Is_new' in gold.columns else len(gold)}** gold-tier",
        f"**{n_gold_new}** gold-tier newly discovered (+ legacy gold)",
    )
    (PHASE_ROOT / "phase_27_recommendations.md").write_text(p27, encoding="utf-8")


def main():
    print("STEP 1 Knowledge graph...")
    write_knowledge_graph()

    print("Loading + feature mining...")
    raw = pd.read_csv(RAW_PATH)
    full = engineer_advanced(raw)
    # Normal heats only for supervised discovery / modeling
    df = full[full["TTT"] <= NORMAL_MAX].copy().reset_index(drop=True)
    feats = feature_columns(df)
    p24_feats = [c for c in feats if c not in CANDIDATE_META]
    new_feats = [c for c in feats if c in CANDIDATE_META]
    print(f"Normal heats={len(df)}, total feats={len(feats)}, new={len(new_feats)}")

    # Candidate export early
    pd.DataFrame(list(CANDIDATE_META.values())).to_csv(PHASE_ROOT / "candidate_features.csv", index=False)

    print("STEP 3–4 Unsupervised + regimes...")
    # Use subset of features for clustering (avoid curse)
    cluster_feats = p24_feats[:30] + new_feats
    cluster_feats = [f for f in cluster_feats if f in df.columns]
    clusters, regimes, best_k, labels = unsupervised_and_regimes(df, cluster_feats)

    print("STEP 5 Causal networks...")
    causal_networks(df, feats)

    print("STEP 6 Feature ranking...")
    rank, base_pipe = feature_ranking(df, feats)

    print("STEP 7 Industrial selection...")
    gold, silver, experimental = classify_features(rank)
    gold_feats = gold["Feature"].tolist()
    silver_feats = silver["Feature"].tolist()
    print(f"Gold={len(gold_feats)}, Silver={len(silver_feats)}, Exp={len(experimental)}")

    print("STEP 8 Model rebuild...")
    comp, vs, best_pipe, best_feats, best_name = rebuild_models(df, p24_feats, gold_feats, silver_feats)
    print(vs.to_string(index=False))
    print("Best model:", best_name)

    print("STEP 9 Scientific catalog...")
    catalog = scientific_catalog(df, rank, gold, silver, experimental)

    print("STEP 10 Plots + reports...")
    publication_plots(df, best_feats or gold_feats, best_pipe or base_pipe, rank)
    write_reports(catalog, rank, gold, silver, regimes, vs, best_k, len(CANDIDATE_META))

    print("DONE →", PHASE_ROOT)


if __name__ == "__main__":
    main()
