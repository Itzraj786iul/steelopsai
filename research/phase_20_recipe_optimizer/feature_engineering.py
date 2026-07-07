"""
Minimal feature engineering for recipe optimization.

Mirrors Phase 16 logic for the 22 model features used in Phase 19.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

SHIFT_MAP = {"A": 0, "B": 1, "C": 2}
MODEL_FEATURES = [
    "HM_X_POWER",
    "BUCKET_X_CPC",
    "OXYGEN_PER_TONNE",
    "POWER_PER_TONNE",
    "SOLID_BURDEN_RATIO",
    "HM_TO_DRI_RATIO",
    "BURDEN_SHARE_RANGE",
    "HM_TO_BUCKET_RATIO",
    "BUCKET_X_DOLO",
    "CPC_X_DRI",
    "FLUX_PER_TONNE",
    "FLUX_TO_CARBON_RATIO",
    "DOLO_X_LIME",
    "DOLO_SQ",
    "CPC_X_HBI",
    "DRI_TO_HBI_RATIO",
    "BUCKET_X_HBI",
    "DOLO_X_HBI",
    "HBI_SQ",
    "SHIFT_LABEL",
    "SHIFT_C",
    "CHARGE_BALANCE_ERROR",
]

OPERATOR_COLS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "Shift"]


def normalize_shift(value: str) -> str:
    text = str(value).strip().upper()
    return text if text in SHIFT_MAP else "C"


def safe_divide(num: pd.Series | float, den: pd.Series | float) -> pd.Series:
    n = pd.to_numeric(num, errors="coerce")
    d = pd.to_numeric(den, errors="coerce")
    if not isinstance(n, pd.Series):
        n = pd.Series([n])
    if not isinstance(d, pd.Series):
        d = pd.Series([d] * len(n))
    out = pd.Series(np.nan, index=n.index, dtype=float)
    valid = n.notna() & d.notna() & d.ne(0)
    out.loc[valid] = n.loc[valid] / d.loc[valid]
    return out


def engineer_recipe_features(recipes: pd.DataFrame) -> pd.DataFrame:
    """Transform operator recipe columns into model feature matrix."""
    work = recipes.copy()
    for col in ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]:
        work[col] = pd.to_numeric(work[col], errors="coerce")

    work["Shift"] = work["Shift"].map(normalize_shift)
    work["T C"] = work["HM"] + work["DRI"] + work["HBI"] + work["Bucket"]
    work["SOLID_BURDEN"] = work["DRI"] + work["HBI"] + work["Bucket"]
    work["TOTAL_FLUX"] = work["LIME"] + work["DOLO"]
    work["CHARGE_BALANCE_ERROR"] = work["HM"] + work["DRI"] + work["HBI"] + work["Bucket"] - work["T C"]

    tc = work["T C"].replace(0, np.nan)
    pct = pd.DataFrame(
        {
            "HM": safe_divide(work["HM"], tc),
            "DRI": safe_divide(work["DRI"], tc),
            "HBI": safe_divide(work["HBI"], tc),
            "Bucket": safe_divide(work["Bucket"], tc),
        }
    )

    feats = pd.DataFrame(index=work.index)
    feats["HM_X_POWER"] = work["HM"] * work["POWER"]
    feats["BUCKET_X_CPC"] = work["Bucket"] * work["CPC"]
    feats["OXYGEN_PER_TONNE"] = safe_divide(work["OXY"], tc)
    feats["POWER_PER_TONNE"] = safe_divide(work["POWER"], tc)
    feats["SOLID_BURDEN_RATIO"] = safe_divide(work["SOLID_BURDEN"], tc)
    feats["HM_TO_DRI_RATIO"] = safe_divide(work["HM"], work["DRI"])
    feats["BURDEN_SHARE_RANGE"] = pct.max(axis=1) - pct.min(axis=1)
    feats["HM_TO_BUCKET_RATIO"] = safe_divide(work["HM"], work["Bucket"])
    feats["BUCKET_X_DOLO"] = work["Bucket"] * work["DOLO"]
    feats["CPC_X_DRI"] = work["CPC"] * work["DRI"]
    feats["FLUX_PER_TONNE"] = safe_divide(work["TOTAL_FLUX"], tc)
    feats["FLUX_TO_CARBON_RATIO"] = safe_divide(work["TOTAL_FLUX"], work["CPC"])
    feats["DOLO_X_LIME"] = work["DOLO"] * work["LIME"]
    feats["DOLO_SQ"] = work["DOLO"] ** 2
    feats["CPC_X_HBI"] = work["CPC"] * work["HBI"]
    feats["DRI_TO_HBI_RATIO"] = safe_divide(work["DRI"], work["HBI"])
    feats["BUCKET_X_HBI"] = work["Bucket"] * work["HBI"]
    feats["DOLO_X_HBI"] = work["DOLO"] * work["HBI"]
    feats["HBI_SQ"] = work["HBI"] ** 2
    feats["SHIFT_LABEL"] = work["Shift"].map(SHIFT_MAP).astype(float)
    feats["SHIFT_C"] = (work["Shift"] == "C").astype(float)
    feats["CHARGE_BALANCE_ERROR"] = work["CHARGE_BALANCE_ERROR"]

    return feats[MODEL_FEATURES].replace([np.inf, -np.inf], np.nan)
