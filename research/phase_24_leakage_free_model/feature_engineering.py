"""
Phase 24 — Leakage-free feature engineering.

Uses ONLY planning-time variables per Phase 23.5 causal audit.
Never uses EE_KWH (POWER), energy-derived features, or target-derived encodings.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

SHIFT_MAP = {"A": 0, "B": 1, "C": 2}
NOMINAL_CHARGE_T = 120.0

# Columns that must never enter feature matrices (post-process / leaky).
LEAKY_RAW = {"POWER", "EE_KWH", "TTT"}
LEAKY_FEATURE_TOKENS = (
    "POWER",
    "EE_KWH",
    "SPECIFIC_ENERGY",
    "CHARGE_BALANCE_ERROR",
    "SHIFT_TARGET_ENCODED",
)

# OXY/CPC-derived features excluded in Dataset B.
OXY_CPC_DERIVED_PREFIXES = (
    "OXYGEN_",
    "CARBON_",
    "SPECIFIC_OXYGEN",
    "SPECIFIC_CARBON",
    "CPC_",
    "OXY_",
)
OXY_CPC_RAW = {"OXY", "CPC"}
OXY_CPC_INTERACTIONS = {
    "BUCKET_X_CPC",
    "CPC_X_DRI",
    "CPC_X_HBI",
    "CPC_X_HM",
    "CPC_X_LIME",
    "CPC_X_DOLO",
    "CPC_X_OXY",
    "FLUX_TO_CARBON_RATIO",
    "CARBON_TO_OXYGEN_RATIO",
    "HM_X_OXY",
    "DRI_X_OXY",
    "BUCKET_X_OXY",
    "DOLO_X_OXY",
    "LIME_X_OXY",
    "HBI_X_OXY",
    "OXYGEN_PER_TONNE",
    "CARBON_PER_TONNE",
    "OXYGEN_PER_METALLIC_TONNE",
    "CARBON_PER_METALLIC_TONNE",
    "OXYGEN_INTENSITY",
    "CARBON_INTENSITY",
    "OXY_PER_HM",
    "HM_X_OXY_NORM",
    "OXY_SQ",
    "CPC_SQ",
}


def normalize_shift(value: object) -> str:
    text = str(value).strip().upper()
    return text if text in SHIFT_MAP else "C"


def safe_divide(num: pd.Series | float, den: pd.Series | float, zero_fill: float = 0.0) -> pd.Series:
    n = pd.to_numeric(num, errors="coerce")
    d = pd.to_numeric(den, errors="coerce")
    if not isinstance(n, pd.Series):
        n = pd.Series([n])
    if not isinstance(d, pd.Series):
        d = pd.Series([d] * len(n))
    out = pd.Series(zero_fill, index=n.index, dtype=float)
    valid = n.notna() & d.notna() & d.ne(0)
    out.loc[valid] = n.loc[valid] / d.loc[valid]
    return out


def is_leaky_feature_name(name: str) -> bool:
    upper = name.upper()
    if upper in LEAKY_RAW:
        return True
    for token in LEAKY_FEATURE_TOKENS:
        if token in upper:
            return True
    if "X_POWER" in upper or upper.endswith("_POWER"):
        return True
    return False


def is_oxy_cpc_feature(name: str) -> bool:
    if name in OXY_CPC_RAW or name in OXY_CPC_INTERACTIONS:
        return True
    upper = name.upper()
    for prefix in OXY_CPC_DERIVED_PREFIXES:
        if upper.startswith(prefix) or f"_{prefix}" in upper:
            return True
    if "X_OXY" in upper or "X_CPC" in upper:
        return True
    if upper in {"OXYGEN_PER_TONNE", "CARBON_PER_TONNE"}:
        return True
    return False


def prepare_base_frame(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    work.columns = [c.strip() for c in work.columns]
    for col in ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY", "T C", "TTT"]:
        if col in work.columns:
            work[col] = pd.to_numeric(work[col], errors="coerce")
    if "Shift" in work.columns:
        work["Shift"] = work["Shift"].map(normalize_shift)
    work["T C"] = work["HM"] + work["DRI"] + work["HBI"] + work["Bucket"]
    work["SOLID_BURDEN"] = work["DRI"] + work["HBI"] + work["Bucket"]
    work["VIRGIN_BURDEN"] = work["HM"] + work["DRI"] + work["HBI"]
    work["TOTAL_FLUX"] = work["LIME"] + work["DOLO"]
    work["TOTAL_METALLIC"] = work["T C"]
    return work


def engineer_planning_features(work: pd.DataFrame, include_oxy_cpc: bool) -> pd.DataFrame:
    """Build literature-supported planning features. No EE_KWH."""
    tc = work["T C"].replace(0, np.nan)
    solid = work["SOLID_BURDEN"].replace(0, np.nan)
    metallic = work["TOTAL_METALLIC"].replace(0, np.nan)

    pct = pd.DataFrame(
        {
            "HM": safe_divide(work["HM"], tc),
            "DRI": safe_divide(work["DRI"], tc),
            "HBI": safe_divide(work["HBI"], tc),
            "Bucket": safe_divide(work["Bucket"], tc),
        }
    )

    feats = pd.DataFrame(index=work.index)

    # --- Burden composition (Memoli 2021; Kirschen 2011) ---
    feats["HM_FRAC"] = pct["HM"]
    feats["DRI_FRAC"] = pct["DRI"]
    feats["HBI_FRAC"] = pct["HBI"]
    feats["SCRAP_FRAC"] = pct["Bucket"]
    feats["SOLID_BURDEN_RATIO"] = safe_divide(work["SOLID_BURDEN"], tc)
    feats["LIQUID_BURDEN_RATIO"] = safe_divide(work["HM"], tc)
    feats["LIQUID_TO_SOLID_RATIO"] = safe_divide(work["HM"], solid)
    feats["VIRGIN_BURDEN_RATIO"] = safe_divide(work["VIRGIN_BURDEN"], tc)
    feats["CHARGE_DEVIATION_FROM_120"] = work["T C"] - NOMINAL_CHARGE_T
    feats["RELATIVE_CHARGE_DEVIATION"] = safe_divide(work["T C"] - NOMINAL_CHARGE_T, NOMINAL_CHARGE_T)
    feats["CHARGE_SIZE_TC"] = work["T C"]

    # --- Burden ratios (Duan 2014; Yang 2023) ---
    feats["HM_TO_DRI_RATIO"] = safe_divide(work["HM"], work["DRI"])
    feats["HM_TO_BUCKET_RATIO"] = safe_divide(work["HM"], work["Bucket"])
    feats["DRI_TO_BUCKET_RATIO"] = safe_divide(work["DRI"], work["Bucket"])
    feats["DRI_TO_HBI_RATIO"] = safe_divide(work["DRI"], work["HBI"])
    feats["HM_TO_HBI_RATIO"] = safe_divide(work["HM"], work["HBI"])
    feats["VIRGIN_TO_SCRAP_RATIO"] = safe_divide(work["VIRGIN_BURDEN"], work["Bucket"])
    feats["BURDEN_SHARE_RANGE"] = pct.max(axis=1) - pct.min(axis=1)

    avg_other_hm = (pct["DRI"] + pct["HBI"] + pct["Bucket"]) / 3.0
    avg_other_dri = (pct["HM"] + pct["HBI"] + pct["Bucket"]) / 3.0
    avg_other_scrap = (pct["HM"] + pct["DRI"] + pct["HBI"]) / 3.0
    feats["HM_DOMINANCE"] = pct["HM"] - avg_other_hm
    feats["DRI_DOMINANCE"] = pct["DRI"] - avg_other_dri
    feats["SCRAP_DOMINANCE"] = pct["Bucket"] - avg_other_scrap

    # --- Flux / slag practice (Memoli 2021 slag basicity) ---
    feats["FLUX_PER_TONNE"] = safe_divide(work["TOTAL_FLUX"], tc)
    feats["LIME_PER_TONNE"] = safe_divide(work["LIME"], tc)
    feats["DOLO_PER_TONNE"] = safe_divide(work["DOLO"], tc)
    feats["LIME_TO_DOLO_RATIO"] = safe_divide(work["LIME"], work["DOLO"])
    feats["FLUX_PER_SOLID_BURDEN"] = safe_divide(work["TOTAL_FLUX"], solid)
    feats["DOLO_X_LIME"] = work["DOLO"] * work["LIME"]
    feats["DOLO_SQ"] = work["DOLO"] ** 2
    feats["LIME_SQ"] = work["LIME"] ** 2

    # --- Burden interactions (no energy) ---
    feats["BUCKET_X_DOLO"] = work["Bucket"] * work["DOLO"]
    feats["BUCKET_X_DRI"] = work["Bucket"] * work["DRI"]
    feats["BUCKET_X_HM"] = work["Bucket"] * work["HM"]
    feats["BUCKET_X_HBI"] = work["Bucket"] * work["HBI"]
    feats["DRI_X_HM"] = work["DRI"] * work["HM"]
    feats["DRI_X_LIME"] = work["DRI"] * work["LIME"]
    feats["HM_X_LIME"] = work["HM"] * work["LIME"]
    feats["DOLO_X_DRI"] = work["DOLO"] * work["DRI"]
    feats["DOLO_X_HM"] = work["DOLO"] * work["HM"]
    feats["DOLO_X_HBI"] = work["DOLO"] * work["HBI"]
    feats["HBI_SQ"] = work["HBI"] ** 2
    feats["HM_SQ"] = work["HM"] ** 2
    feats["DRI_SQ"] = work["DRI"] ** 2
    feats["BUCKET_SQ"] = work["Bucket"] ** 2

    # --- OXY/CPC branch (Dataset A only — assumed planning setpoints) ---
    if include_oxy_cpc:
        feats["OXYGEN_PER_TONNE"] = safe_divide(work["OXY"], tc)
        feats["CARBON_PER_TONNE"] = safe_divide(work["CPC"], tc)
        feats["OXY_PER_HM"] = safe_divide(work["OXY"], work["HM"])
        feats["HM_X_OXY_NORM"] = safe_divide(work["HM"] * work["OXY"], tc)
        feats["BUCKET_X_CPC"] = work["Bucket"] * work["CPC"]
        feats["CPC_X_DRI"] = work["CPC"] * work["DRI"]
        feats["CPC_X_HBI"] = work["CPC"] * work["HBI"]
        feats["FLUX_TO_CARBON_RATIO"] = safe_divide(work["TOTAL_FLUX"], work["CPC"])
        feats["CARBON_TO_OXYGEN_RATIO"] = safe_divide(work["CPC"], work["OXY"])

    # --- Shift encodings ---
    feats["SHIFT_LABEL"] = work["Shift"].map(SHIFT_MAP).astype(float)
    feats["SHIFT_A"] = (work["Shift"] == "A").astype(float)
    feats["SHIFT_B"] = (work["Shift"] == "B").astype(float)
    feats["SHIFT_C"] = (work["Shift"] == "C").astype(float)

    feats = feats.replace([np.inf, -np.inf], np.nan)
    # Drop any accidental leaky column names
    leaky_cols = [c for c in feats.columns if is_leaky_feature_name(c)]
    if leaky_cols:
        feats = feats.drop(columns=leaky_cols)
    if not include_oxy_cpc:
        oxy_cols = [c for c in feats.columns if is_oxy_cpc_feature(c)]
        if oxy_cols:
            feats = feats.drop(columns=oxy_cols)
    return feats


def build_clean_dataset(
    raw_df: pd.DataFrame,
    include_oxy_cpc: bool,
) -> pd.DataFrame:
    """Return ID + planning raw columns + engineered features + TTT. No EE_KWH."""
    work = prepare_base_frame(raw_df)
    feats = engineer_planning_features(work, include_oxy_cpc=include_oxy_cpc)

    id_cols = [c for c in ["Heat Number", "Date", "Shift"] if c in work.columns]
    raw_planning = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "T C"]
    if include_oxy_cpc:
        raw_planning.extend(["CPC", "OXY"])

    out = pd.concat([work[id_cols], work[raw_planning], feats, work[["TTT"]]], axis=1)
    return out


FEATURE_METADATA: dict[str, dict[str, str]] = {
    "HM_FRAC": {
        "formula": "HM / T C",
        "interpretation": "Hot metal share of charge; sensible heat input (Duan 2014)",
        "expected_sign": "Negative on TTT with sufficient O2",
        "literature": "Duan et al. 2014; Yang et al. 2023",
    },
    "DRI_FRAC": {
        "formula": "DRI / T C",
        "interpretation": "DRI burden share; gangue and FeO load (Kirschen 2011)",
        "expected_sign": "Conditional positive/negative",
        "literature": "Kirschen et al. 2011; Memoli et al. 2021",
    },
    "SCRAP_FRAC": {
        "formula": "Bucket / T C",
        "interpretation": "Scrap share; melting profile vs flat DRI bath",
        "expected_sign": "Nonlinear",
        "literature": "Memoli et al. 2021",
    },
    "SOLID_BURDEN_RATIO": {
        "formula": "(DRI+HBI+Bucket) / T C",
        "interpretation": "Solid fraction requiring melting energy",
        "expected_sign": "Positive",
        "literature": "Memoli et al. 2021",
    },
    "LIQUID_TO_SOLID_RATIO": {
        "formula": "HM / (DRI+HBI+Bucket)",
        "interpretation": "HM-assisted scrap/DRI melting",
        "expected_sign": "Negative",
        "literature": "Duan et al. 2014",
    },
    "HM_TO_DRI_RATIO": {
        "formula": "HM / DRI",
        "interpretation": "Substitution balance between liquid and DRI",
        "expected_sign": "Conditional",
        "literature": "Duan et al. 2014; Kirschen 2011",
    },
    "FLUX_PER_TONNE": {
        "formula": "(LIME+DOLO) / T C",
        "interpretation": "Slag volume proxy per tonne",
        "expected_sign": "Weak positive",
        "literature": "Memoli et al. 2021",
    },
    "LIME_TO_DOLO_RATIO": {
        "formula": "LIME / DOLO",
        "interpretation": "Basicity / MgO saturation proxy",
        "expected_sign": "Conditional",
        "literature": "Memoli et al. 2021",
    },
    "HM_X_OXY_NORM": {
        "formula": "HM * OXY / T C",
        "interpretation": "HM–oxygen coordination (Dataset A only)",
        "expected_sign": "Negative",
        "literature": "Duan et al. 2014",
    },
    "OXYGEN_PER_TONNE": {
        "formula": "OXY / T C",
        "interpretation": "Specific oxygen intensity if planned setpoint",
        "expected_sign": "Negative (if setpoint)",
        "literature": "Duan et al. 2014",
    },
    "BUCKET_X_CPC": {
        "formula": "Bucket * CPC",
        "interpretation": "Scrap × carbon for foamy slag",
        "expected_sign": "Negative",
        "literature": "Morales et al. 2025",
    },
    "CPC_X_DRI": {
        "formula": "CPC * DRI",
        "interpretation": "Carbon × DRI FeO for foam generation",
        "expected_sign": "Negative",
        "literature": "Morales et al. 2025; Kirschen 2011",
    },
    "BURDEN_SHARE_RANGE": {
        "formula": "max(burden%) - min(burden%)",
        "interpretation": "Charge heterogeneity",
        "expected_sign": "Ambiguous",
        "literature": "Phase 18 empirical",
    },
    "CHARGE_DEVIATION_FROM_120": {
        "formula": "T C - 120",
        "interpretation": "Departure from nominal furnace charge",
        "expected_sign": "Positive",
        "literature": "JSPL nominal practice",
    },
}
