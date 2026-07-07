"""
Phase 16 - Industrial Feature Engineering for NORMAL TTT.

This phase generates candidate industrial features for predicting NORMAL
Tap-to-Tap Time (TTT) from the finalized dataset validated in Phase 14.

Outputs:
- terminal tables only
- PNG plots only
- engineered dataset CSV
"""

from __future__ import annotations

import logging
import math
import sys
from collections import defaultdict
from itertools import combinations
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.feature_selection import f_regression, mutual_info_regression
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from tabulate import tabulate


PHASE_ROOT = Path(__file__).resolve().parent
PLOTS_DIR = PHASE_ROOT / "plots"
DATASET_PATH = Path(__file__).resolve().parents[1] / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
OUTPUT_DATASET_PATH = PHASE_ROOT / "engineered_normal_ttt_dataset.csv"

ID_COL = "Heat Number"
DATE_COL = "Date"
SHIFT_COL = "Shift"
TARGET = "TTT"

ORIGINAL_FEATURES = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "T C", SHIFT_COL]
NUMERIC_ORIGINAL_FEATURES = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "T C"]
NORMAL_TTT_MAX = 60.0
NOMINAL_HEAT_SIZE = 120.0

FEATURE_GROUP_ORDER = [
    "Raw process variables",
    "Burden composition",
    "Energy",
    "Oxygen",
    "Flux",
    "Ratios",
    "Interactions",
    "Polynomial",
    "Operational indicators",
    "Shift encodings",
    "Analysis only",
]


def setup_logging() -> logging.Logger:
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
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
            "axes.titlesize": 13,
            "axes.labelsize": 11,
            "font.size": 10,
            "savefig.dpi": 180,
        }
    )
    return logging.getLogger("phase_16")


def section(title: str) -> None:
    print("\n" + "=" * 74)
    print(title)
    print("=" * 74)


def print_table(rows: list[list[Any]], headers: list[str]) -> None:
    print(tabulate(rows, headers=headers, tablefmt="github", floatfmt=".4f"))


def save_plot(fig: plt.Figure, name: str) -> None:
    out = PLOTS_DIR / f"{name}.png"
    fig.tight_layout()
    fig.savefig(out, bbox_inches="tight")
    plt.close(fig)
    print(f"[plot saved] {out}")


def load_dataset(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"Finalized dataset not found: {path}")
    return pd.read_csv(path, low_memory=False)


def normalize_shift(value: Any) -> str:
    if pd.isna(value):
        return "UNKNOWN"
    text = str(value).strip()
    for ch in text:
        if ch.isalpha():
            ch = ch.upper()
            if ch in {"A", "B", "C"}:
                return ch
    return "UNKNOWN"


def safe_token(name: str) -> str:
    return (
        name.upper()
        .replace("%", "PCT")
        .replace("/", "_PER_")
        .replace(" ", "_")
        .replace("-", "_")
    )


def safe_divide(numerator: pd.Series | float, denominator: pd.Series | float, multiplier: float = 1.0) -> pd.Series:
    num = pd.to_numeric(pd.Series(numerator), errors="coerce") if not isinstance(numerator, pd.Series) else pd.to_numeric(numerator, errors="coerce")
    den = pd.to_numeric(pd.Series(denominator), errors="coerce") if not isinstance(denominator, pd.Series) else pd.to_numeric(denominator, errors="coerce")
    if len(num) == 1 and len(den) > 1:
        num = pd.Series(float(num.iloc[0]), index=den.index, dtype="float64")
    if len(den) == 1 and len(num) > 1:
        den = pd.Series(float(den.iloc[0]), index=num.index, dtype="float64")
    out = pd.Series(np.nan, index=num.index, dtype="float64")
    valid = num.notna() & den.notna() & den.ne(0)
    out.loc[valid] = num.loc[valid] / den.loc[valid] * multiplier
    return out


def register_feature(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
    name: str,
    values: pd.Series,
    group: str,
    note: str,
    *,
    analysis_only: bool = False,
) -> None:
    work[name] = values
    feature_groups[group].append(name)
    feature_meta[name] = {"group": group, "analysis_only": analysis_only, "note": note}


def prepare_working_frame(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    for col in NUMERIC_ORIGINAL_FEATURES + [TARGET]:
        work[col] = pd.to_numeric(work[col], errors="coerce")
    work[SHIFT_COL] = work[SHIFT_COL].map(normalize_shift)
    work["Industrial_Class"] = pd.cut(
        work[TARGET],
        bins=[-np.inf, NORMAL_TTT_MAX, 180.0, np.inf],
        labels=["NORMAL", "DELAY", "SHUTDOWN"],
        right=True,
    )
    work = work.loc[work["Industrial_Class"] == "NORMAL"].copy()
    work["TOTAL_METALLIC_INPUT"] = work[["HM", "DRI", "HBI", "Bucket"]].sum(axis=1)
    work["VIRGIN_BURDEN"] = work[["HM", "DRI", "HBI"]].sum(axis=1)
    work["SOLID_BURDEN"] = work[["DRI", "HBI", "Bucket"]].sum(axis=1)
    work["TOTAL_FLUX"] = work["LIME"] + work["DOLO"]
    work["CHARGE_BALANCE_ERROR"] = work["TOTAL_METALLIC_INPUT"] - work["T C"]
    return work


def step1_keep_original_variables(work: pd.DataFrame) -> None:
    section("STEP 1 - ORIGINAL VARIABLES KEPT")
    rows = [[idx + 1, col] for idx, col in enumerate(ORIGINAL_FEATURES)]
    print_table(rows, ["#", "Original variable"])
    print(f"\nNormal-heats dataset size: {len(work)} rows")


def create_foundation_features(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> list[str]:
    created = [
        "TOTAL_METALLIC_INPUT",
        "VIRGIN_BURDEN",
        "SOLID_BURDEN",
        "TOTAL_FLUX",
        "CHARGE_BALANCE_ERROR",
        "CHARGE_DEVIATION_FROM_120",
        "RELATIVE_CHARGE_DEVIATION",
    ]
    register_feature(work, feature_groups, feature_meta, "TOTAL_METALLIC_INPUT", work["TOTAL_METALLIC_INPUT"], "Burden composition", "Total metallic burden from HM + DRI + HBI + Bucket.")
    register_feature(work, feature_groups, feature_meta, "VIRGIN_BURDEN", work["VIRGIN_BURDEN"], "Burden composition", "Virgin metallic burden from HM + DRI + HBI.")
    register_feature(work, feature_groups, feature_meta, "SOLID_BURDEN", work["SOLID_BURDEN"], "Burden composition", "Solid burden from DRI + HBI + Bucket.")
    register_feature(work, feature_groups, feature_meta, "TOTAL_FLUX", work["TOTAL_FLUX"], "Flux", "Total flux addition.")
    register_feature(work, feature_groups, feature_meta, "CHARGE_BALANCE_ERROR", work["CHARGE_BALANCE_ERROR"], "Operational indicators", "Gap between metallic burden and stated total charge.")
    register_feature(work, feature_groups, feature_meta, "CHARGE_DEVIATION_FROM_120", work["T C"] - NOMINAL_HEAT_SIZE, "Operational indicators", "Deviation from nominal 120 tonne heat size.")
    register_feature(
        work,
        feature_groups,
        feature_meta,
        "RELATIVE_CHARGE_DEVIATION",
        safe_divide(work["T C"] - NOMINAL_HEAT_SIZE, pd.Series(NOMINAL_HEAT_SIZE, index=work.index)),
        "Operational indicators",
        "Relative departure from nominal heat size.",
    )
    return created


def step2_burden_ratio_features(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> list[str]:
    section("STEP 2 - BURDEN RATIO FEATURES")
    burden_vars = ["HM", "DRI", "HBI", "Bucket"]
    created: list[str] = []

    for col in burden_vars:
        pct_name = f"{safe_token(col)}_PCT_TC"
        share_name = f"{safe_token(col)}_SHARE_METALLIC"
        register_feature(work, feature_groups, feature_meta, pct_name, safe_divide(work[col], work["T C"], 100.0), "Burden composition", f"{col} as percent of total charge.")
        register_feature(work, feature_groups, feature_meta, share_name, safe_divide(work[col], work["TOTAL_METALLIC_INPUT"], 100.0), "Burden composition", f"{col} share within metallic input.")
        created.extend([pct_name, share_name])

    for left, right in combinations(burden_vars, 2):
        ratio_name = f"{safe_token(left)}_TO_{safe_token(right)}_RATIO"
        register_feature(work, feature_groups, feature_meta, ratio_name, safe_divide(work[left], work[right]), "Ratios", f"{left} to {right} burden ratio.")
        created.append(ratio_name)

    special_ratios = {
        "SCRAP_RATIO": safe_divide(work["Bucket"], work["T C"]),
        "VIRGIN_BURDEN_RATIO": safe_divide(work["VIRGIN_BURDEN"], work["T C"]),
        "METALLIC_BURDEN_RATIO": safe_divide(work["TOTAL_METALLIC_INPUT"], work["T C"]),
        "SOLID_BURDEN_RATIO": safe_divide(work["SOLID_BURDEN"], work["T C"]),
        "LIQUID_BURDEN_RATIO": safe_divide(work["HM"], work["T C"]),
        "LIQUID_TO_SOLID_RATIO": safe_divide(work["HM"], work["SOLID_BURDEN"]),
        "VIRGIN_TO_SCRAP_RATIO": safe_divide(work["VIRGIN_BURDEN"], work["Bucket"]),
        "FLUX_PER_TONNE": safe_divide(work["TOTAL_FLUX"], work["T C"]),
        "CARBON_PER_TONNE": safe_divide(work["CPC"], work["T C"]),
        "POWER_PER_TONNE": safe_divide(work["POWER"], work["T C"]),
        "OXYGEN_PER_TONNE": safe_divide(work["OXY"], work["T C"]),
    }
    for name, values in special_ratios.items():
        group = "Ratios" if "RATIO" in name else "Operational indicators"
        register_feature(work, feature_groups, feature_meta, name, values, group, f"Programmatically generated physically meaningful ratio: {name}.")
        created.append(name)

    rows = [[name, feature_meta[name]["group"], feature_meta[name]["note"]] for name in created]
    print_table(rows, ["Feature", "Group", "Meaning"])
    return created


def meaningful_interaction_pairs() -> list[tuple[str, str]]:
    burden = {"HM", "DRI", "HBI", "Bucket"}
    flux = {"LIME", "DOLO"}
    resource = {"CPC", "POWER", "OXY"}
    candidates = list(burden | flux | resource)
    pairs: list[tuple[str, str]] = []
    for left, right in combinations(sorted(candidates), 2):
        left_group = "burden" if left in burden else "flux" if left in flux else "resource"
        right_group = "burden" if right in burden else "flux" if right in flux else "resource"
        if left_group == "burden" and right_group == "burden":
            pairs.append((left, right))
        elif {left_group, right_group} == {"burden", "resource"}:
            pairs.append((left, right))
        elif {left_group, right_group} == {"burden", "flux"}:
            pairs.append((left, right))
        elif left_group == "flux" and right_group == "flux":
            pairs.append((left, right))
        elif {left_group, right_group} == {"flux", "resource"}:
            pairs.append((left, right))
        elif left_group == "resource" and right_group == "resource":
            pairs.append((left, right))
    return pairs


def step3_interaction_features(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> list[str]:
    section("STEP 3 - INTERACTION FEATURES")
    created: list[str] = []
    for left, right in meaningful_interaction_pairs():
        name = f"{safe_token(left)}_X_{safe_token(right)}"
        register_feature(work, feature_groups, feature_meta, name, work[left] * work[right], "Interactions", f"Interaction between {left} and {right}.")
        created.append(name)

    rows = [[name, feature_meta[name]["note"]] for name in created]
    print_table(rows, ["Interaction feature", "Meaning"])
    return created


def step4_polynomial_features(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> list[str]:
    section("STEP 4 - POLYNOMIAL FEATURES")
    square_vars = ["HM", "DRI", "HBI", "Bucket", "POWER", "OXY", "CPC", "LIME", "DOLO", "T C"]
    created: list[str] = []
    for col in square_vars:
        name = f"{safe_token(col)}_SQ"
        register_feature(work, feature_groups, feature_meta, name, work[col] ** 2, "Polynomial", f"Squared term for {col}.")
        created.append(name)
    print_table([[name] for name in created], ["Squared feature"])
    return created


def step5_operational_efficiency_features(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> list[str]:
    section("STEP 5 - OPERATIONAL EFFICIENCY FEATURES")
    created: list[str] = []

    per_charge_defs = {
        "POWER_PER_TONNE": work.get("POWER_PER_TONNE", safe_divide(work["POWER"], work["T C"])),
        "OXYGEN_PER_TONNE": work.get("OXYGEN_PER_TONNE", safe_divide(work["OXY"], work["T C"])),
        "CARBON_PER_TONNE": work.get("CARBON_PER_TONNE", safe_divide(work["CPC"], work["T C"])),
        "FLUX_PER_TONNE": work.get("FLUX_PER_TONNE", safe_divide(work["TOTAL_FLUX"], work["T C"])),
        "LIME_PER_TONNE": safe_divide(work["LIME"], work["T C"]),
        "DOLO_PER_TONNE": safe_divide(work["DOLO"], work["T C"]),
    }
    alias_defs = {
        "SPECIFIC_ENERGY": per_charge_defs["POWER_PER_TONNE"],
        "SPECIFIC_OXYGEN": per_charge_defs["OXYGEN_PER_TONNE"],
        "SPECIFIC_CARBON": per_charge_defs["CARBON_PER_TONNE"],
        "SPECIFIC_LIME": per_charge_defs["LIME_PER_TONNE"],
        "SPECIFIC_DOLOMITE": per_charge_defs["DOLO_PER_TONNE"],
    }
    per_metallic_defs = {
        "POWER_PER_METALLIC_TONNE": safe_divide(work["POWER"], work["TOTAL_METALLIC_INPUT"]),
        "OXYGEN_PER_METALLIC_TONNE": safe_divide(work["OXY"], work["TOTAL_METALLIC_INPUT"]),
        "CARBON_PER_METALLIC_TONNE": safe_divide(work["CPC"], work["TOTAL_METALLIC_INPUT"]),
        "FLUX_PER_METALLIC_TONNE": safe_divide(work["TOTAL_FLUX"], work["TOTAL_METALLIC_INPUT"]),
        "LIME_PER_METALLIC_TONNE": safe_divide(work["LIME"], work["TOTAL_METALLIC_INPUT"]),
        "DOLO_PER_METALLIC_TONNE": safe_divide(work["DOLO"], work["TOTAL_METALLIC_INPUT"]),
    }
    ratio_defs = {
        "POWER_TO_OXYGEN_RATIO": safe_divide(work["POWER"], work["OXY"]),
        "CARBON_TO_OXYGEN_RATIO": safe_divide(work["CPC"], work["OXY"]),
        "FLUX_TO_CARBON_RATIO": safe_divide(work["TOTAL_FLUX"], work["CPC"]),
    }

    for family_defs in [per_charge_defs, alias_defs, per_metallic_defs, ratio_defs]:
        for name, values in family_defs.items():
            group = "Energy" if "POWER" in name or "ENERGY" in name else "Oxygen" if "OXYGEN" in name else "Flux" if "FLUX" in name or "LIME" in name or "DOLO" in name else "Operational indicators"
            register_feature(work, feature_groups, feature_meta, name, values, group, f"Operational efficiency feature: {name}.")
            created.append(name)

    rows = [[name, feature_meta[name]["group"]] for name in created]
    print_table(rows, ["Operational feature", "Assigned group"])
    return created


def step6_burden_balance_indicators(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> list[str]:
    section("STEP 6 - BURDEN BALANCE INDICATORS")
    pct_cols = {
        "HM": work["HM_PCT_TC"],
        "DRI": work["DRI_PCT_TC"],
        "HBI": work["HBI_PCT_TC"],
        "Bucket": work["BUCKET_PCT_TC"],
    }
    avg_other = {
        key: pd.concat([series for other_key, series in pct_cols.items() if other_key != key], axis=1).mean(axis=1)
        for key in pct_cols
    }

    indicators = {
        "HM_DOMINANCE": pct_cols["HM"] - avg_other["HM"],
        "DRI_DOMINANCE": pct_cols["DRI"] - avg_other["DRI"],
        "HBI_DOMINANCE": pct_cols["HBI"] - avg_other["HBI"],
        "SCRAP_DOMINANCE": pct_cols["Bucket"] - avg_other["Bucket"],
        "BURDEN_SHARE_RANGE": pd.concat(list(pct_cols.values()), axis=1).max(axis=1) - pd.concat(list(pct_cols.values()), axis=1).min(axis=1),
        "METALLIC_PERCENTAGE": safe_divide(work["TOTAL_METALLIC_INPUT"], work["T C"], 100.0),
        "FLUX_INTENSITY": safe_divide(work["TOTAL_FLUX"], work["TOTAL_METALLIC_INPUT"]),
        "CARBON_INTENSITY": safe_divide(work["CPC"], work["TOTAL_METALLIC_INPUT"]),
        "POWER_INTENSITY": safe_divide(work["POWER"], work["TOTAL_METALLIC_INPUT"]),
        "OXYGEN_INTENSITY": safe_divide(work["OXY"], work["TOTAL_METALLIC_INPUT"]),
    }

    created: list[str] = []
    for name, values in indicators.items():
        group = "Burden composition" if "DOMINANCE" in name or "METALLIC" in name or "BURDEN" in name else "Operational indicators"
        register_feature(work, feature_groups, feature_meta, name, values, group, f"Burden balance indicator: {name}.")
        created.append(name)

    rows = [[name, feature_meta[name]["group"], feature_meta[name]["note"]] for name in created]
    print_table(rows, ["Indicator", "Group", "Meaning"])
    return created


def step7_encode_shift(
    work: pd.DataFrame,
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> tuple[list[str], list[str]]:
    section("STEP 7 - SHIFT ENCODING")
    created: list[str] = []
    analysis_only: list[str] = []

    shift_levels = sorted(work[SHIFT_COL].dropna().unique().tolist())
    label_map = {label: idx for idx, label in enumerate(shift_levels)}
    label_name = "SHIFT_LABEL"
    register_feature(work, feature_groups, feature_meta, label_name, work[SHIFT_COL].map(label_map).astype(float), "Shift encodings", "Label encoding for Shift.")
    created.append(label_name)

    dummies = pd.get_dummies(work[SHIFT_COL], prefix="SHIFT", dtype=float)
    for col in dummies.columns:
        register_feature(work, feature_groups, feature_meta, col, dummies[col], "Shift encodings", f"One-hot encoding for {col}.")
        created.append(col)

    te_name = "SHIFT_TARGET_ENCODED_ANALYSIS"
    target_encoded = work.groupby(SHIFT_COL)[TARGET].transform("mean")
    register_feature(
        work,
        feature_groups,
        feature_meta,
        te_name,
        target_encoded,
        "Analysis only",
        "Shift target encoding for analysis only; leakage-prone for model training.",
        analysis_only=True,
    )
    created.append(te_name)
    analysis_only.append(te_name)

    rows = [[name, feature_meta[name]["group"], "Yes" if feature_meta[name]["analysis_only"] else "No"] for name in created]
    print_table(rows, ["Shift feature", "Group", "Analysis only?"])
    print(f"\nShift label mapping: {label_map}")
    return created, analysis_only


def step8_remove_invalid_features(
    work: pd.DataFrame,
    engineered_features: list[str],
    feature_groups: dict[str, list[str]],
    feature_meta: dict[str, dict[str, Any]],
) -> tuple[list[str], pd.DataFrame]:
    section("STEP 8 - REMOVE INVALID ENGINEERED FEATURES")
    feature_frame = work[engineered_features].replace([np.inf, -np.inf], np.nan)
    work[engineered_features] = feature_frame

    nan_columns = [col for col in engineered_features if feature_frame[col].isna().all()]
    constant_columns = [col for col in engineered_features if feature_frame[col].dropna().nunique() <= 1]
    zero_variance_columns = [
        col
        for col in engineered_features
        if col not in constant_columns
        and pd.api.types.is_numeric_dtype(feature_frame[col])
        and feature_frame[col].dropna().std() == 0
    ]

    duplicate_columns: list[str] = []
    if not feature_frame.empty:
        duplicate_mask = feature_frame.T.duplicated(keep="first")
        duplicate_columns = feature_frame.T.index[duplicate_mask].tolist()

    removed_reason: dict[str, list[str]] = defaultdict(list)
    for col in nan_columns:
        removed_reason["All-NaN column"].append(col)
    for col in constant_columns:
        if col not in nan_columns:
            removed_reason["Constant / single-value column"].append(col)
    for col in zero_variance_columns:
        if col not in nan_columns and col not in constant_columns:
            removed_reason["Zero variance column"].append(col)
    for col in duplicate_columns:
        if col not in nan_columns and col not in constant_columns and col not in zero_variance_columns:
            removed_reason["Duplicate engineered column"].append(col)

    removed = {col for cols in removed_reason.values() for col in cols}
    usable_engineered = [col for col in engineered_features if col not in removed]

    rows = [[reason, len(cols), ", ".join(cols[:12]) + (" ..." if len(cols) > 12 else "")] for reason, cols in removed_reason.items()]
    if rows:
        print_table(rows, ["Removal reason", "Count", "Examples"])
    else:
        print("No invalid engineered features were removed.")

    for group in list(feature_groups.keys()):
        feature_groups[group] = [col for col in feature_groups[group] if col in usable_engineered or col in ORIGINAL_FEATURES]
    for col in removed:
        feature_meta.pop(col, None)

    return usable_engineered, work


def mutual_info_feature(feature: pd.Series, target: pd.Series) -> float:
    pair = pd.concat([feature, target], axis=1).replace([np.inf, -np.inf], np.nan).dropna()
    if len(pair) < 3 or pair.iloc[:, 0].nunique() <= 1:
        return math.nan
    x = pair.iloc[:, [0]].to_numpy()
    y = pair.iloc[:, 1].to_numpy()
    discrete = bool(pair.iloc[:, 0].nunique() <= 10 and np.allclose(pair.iloc[:, 0].to_numpy(), np.round(pair.iloc[:, 0].to_numpy())))
    return float(mutual_info_regression(x, y, discrete_features=discrete, random_state=42)[0])


def f_score_feature(feature: pd.Series, target: pd.Series) -> float:
    pair = pd.concat([feature, target], axis=1).replace([np.inf, -np.inf], np.nan).dropna()
    if len(pair) < 3 or pair.iloc[:, 0].nunique() <= 1:
        return math.nan
    x = pair.iloc[:, [0]].to_numpy()
    y = pair.iloc[:, 1].to_numpy()
    return float(f_regression(x, y)[0][0])


def feature_group_lookup(feature_meta: dict[str, dict[str, Any]], feature_name: str) -> str:
    if feature_name in ORIGINAL_FEATURES or feature_name in NUMERIC_ORIGINAL_FEATURES:
        if feature_name in {"POWER"}:
            return "Energy"
        if feature_name in {"OXY"}:
            return "Oxygen"
        if feature_name in {"LIME", "DOLO"}:
            return "Flux"
        return "Raw process variables"
    return feature_meta.get(feature_name, {}).get("group", "Unknown")


def step9_rank_features(
    work: pd.DataFrame,
    usable_engineered: list[str],
    feature_meta: dict[str, dict[str, Any]],
) -> pd.DataFrame:
    section("STEP 9 - FEATURE IMPORTANCE WITHOUT MODEL TRAINING")
    feature_candidates = NUMERIC_ORIGINAL_FEATURES + [col for col in usable_engineered if col not in {TARGET}]
    rows: list[list[Any]] = []

    for col in feature_candidates:
        pair = pd.concat([work[col], work[TARGET]], axis=1).replace([np.inf, -np.inf], np.nan).dropna()
        if len(pair) < 3 or pair.iloc[:, 0].nunique() <= 1:
            rows.append([col, feature_group_lookup(feature_meta, col), math.nan, math.nan, math.nan, math.nan, "Yes" if feature_meta.get(col, {}).get("analysis_only") else "No"])
            continue
        pearson = float(pair.iloc[:, 0].corr(pair.iloc[:, 1], method="pearson"))
        spearman = float(pair.iloc[:, 0].corr(pair.iloc[:, 1], method="spearman"))
        mi = mutual_info_feature(work[col], work[TARGET])
        f_value = f_score_feature(work[col], work[TARGET])
        rows.append([col, feature_group_lookup(feature_meta, col), pearson, spearman, mi, f_value, "Yes" if feature_meta.get(col, {}).get("analysis_only") else "No"])

    rank_df = pd.DataFrame(
        rows,
        columns=["Feature", "Group", "Pearson", "Spearman", "Mutual Information", "ANOVA F-score", "Analysis only?"],
    )
    rank_df["Abs Pearson"] = rank_df["Pearson"].abs()
    rank_df["Abs Spearman"] = rank_df["Spearman"].abs()
    rank_df["Pearson Rank"] = rank_df["Abs Pearson"].rank(ascending=False, method="average")
    rank_df["Spearman Rank"] = rank_df["Abs Spearman"].rank(ascending=False, method="average")
    rank_df["MI Rank"] = rank_df["Mutual Information"].rank(ascending=False, method="average")
    rank_df["F Rank"] = rank_df["ANOVA F-score"].rank(ascending=False, method="average")
    rank_df["Average Rank"] = rank_df[["Pearson Rank", "Spearman Rank", "MI Rank", "F Rank"]].mean(axis=1)
    rank_df = rank_df.sort_values(["Average Rank", "Mutual Information", "Abs Spearman"], ascending=[True, False, False]).reset_index(drop=True)

    print("Top 50 most informative features:")
    print_table(rank_df.head(50).values.tolist(), rank_df.head(50).columns.tolist())

    plot_feature_ranking(rank_df.head(25), "top_25_feature_ranking", "Top 25 Features by Average Rank")
    plot_family_feature_ranking(rank_df, "Ratios", 20, "top_20_ratio_features", "Top 20 Ratio Features")
    plot_family_feature_ranking(rank_df, "Interactions", 20, "top_20_interaction_features", "Top 20 Interaction Features")
    plot_family_feature_ranking(rank_df, "Operational indicators", 20, "top_20_operational_features", "Top 20 Operational Features")
    return rank_df


def plot_feature_ranking(df: pd.DataFrame, name: str, title: str) -> None:
    if df.empty:
        return
    fig, ax = plt.subplots(figsize=(11, 8))
    ax.barh(df["Feature"][::-1], (1.0 / df["Average Rank"])[::-1], color="#4C78A8")
    ax.set_title(title)
    ax.set_xlabel("1 / Average Rank")
    ax.set_ylabel("Feature")
    save_plot(fig, name)


def plot_family_feature_ranking(rank_df: pd.DataFrame, family: str, top_n: int, name: str, title: str) -> None:
    subset = rank_df.loc[rank_df["Group"] == family].head(top_n)
    if subset.empty:
        return
    fig, ax = plt.subplots(figsize=(11, 7))
    ax.barh(subset["Feature"][::-1], (1.0 / subset["Average Rank"])[::-1], color="#F58518")
    ax.set_title(title)
    ax.set_xlabel("1 / Average Rank")
    ax.set_ylabel("Feature")
    save_plot(fig, name)


def compute_vif(df: pd.DataFrame) -> list[list[Any]]:
    if df.empty:
        return []
    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(df)
    rows: list[list[Any]] = []
    for idx, col in enumerate(df.columns):
        y = X[:, idx]
        X_other = np.delete(X, idx, axis=1)
        if X_other.shape[1] == 0 or np.nanstd(y) == 0:
            vif = math.inf
        else:
            model = LinearRegression()
            model.fit(X_other, y)
            r2 = model.score(X_other, y)
            vif = math.inf if r2 >= 0.999999 else 1.0 / (1.0 - r2)
        rows.append([col, float(vif)])
    return rows


def step10_multicollinearity(
    work: pd.DataFrame,
    usable_engineered: list[str],
    feature_meta: dict[str, dict[str, Any]],
) -> tuple[list[list[Any]], list[list[Any]]]:
    section("STEP 10 - MULTICOLLINEARITY")
    correlation_features = NUMERIC_ORIGINAL_FEATURES + [
        col for col in usable_engineered if not feature_meta.get(col, {}).get("analysis_only", False)
    ]
    numeric = work[correlation_features].replace([np.inf, -np.inf], np.nan)
    corr = numeric.corr(method="pearson")

    high_pairs: list[list[Any]] = []
    cols = corr.columns.tolist()
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            value = corr.iloc[i, j]
            if pd.notna(value) and abs(value) > 0.90:
                high_pairs.append([cols[i], cols[j], float(value)])
    high_pairs.sort(key=lambda x: abs(x[2]), reverse=True)

    vif_rows = compute_vif(numeric)
    vif_rows.sort(key=lambda x: (math.inf if math.isinf(x[1]) else x[1]), reverse=True)

    print("Highly correlated feature pairs (> 0.90):")
    if high_pairs:
        print_table(high_pairs[:80], ["Feature A", "Feature B", "Correlation"])
    else:
        print("None")

    print("\nVariance Inflation Factor (VIF):")
    print_table(vif_rows, ["Feature", "VIF"])

    fig, ax = plt.subplots(figsize=(18, 16))
    im = ax.imshow(corr.to_numpy(), cmap="coolwarm", vmin=-1, vmax=1)
    ax.set_xticks(np.arange(len(cols)))
    ax.set_xticklabels(cols, rotation=90)
    ax.set_yticks(np.arange(len(cols)))
    ax.set_yticklabels(cols)
    ax.set_title("Correlation Matrix - Original + Engineered Features")
    fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04, label="Correlation")
    save_plot(fig, "feature_correlation_matrix")

    vif_plot = pd.DataFrame(vif_rows, columns=["Feature", "VIF"]).replace([np.inf, -np.inf], np.nan).dropna().head(25)
    if not vif_plot.empty:
        fig, ax = plt.subplots(figsize=(11, 8))
        ax.barh(vif_plot["Feature"][::-1], vif_plot["VIF"][::-1], color="#54A24B")
        ax.set_title("Top 25 Finite VIF Values")
        ax.set_xlabel("VIF")
        ax.set_ylabel("Feature")
        save_plot(fig, "top_25_vif")

    recommendations = []
    for left, right, corr_value in high_pairs[:25]:
        if left.startswith("SHIFT_") and right.startswith("SHIFT_"):
            note = "Keep k-1 one-hot columns later to avoid dummy-variable collinearity."
        elif "SPECIFIC_" in left or "SPECIFIC_" in right or "_PER_TONNE" in left or "_PER_TONNE" in right:
            note = "Later keep one preferred normalized alias instead of both."
        else:
            note = "Later keep the physically clearer or more stable member of this pair."
        recommendations.append([left, right, corr_value, note])
    if recommendations:
        print("\nLater-removal recommendations:")
        print_table(recommendations, ["Feature A", "Feature B", "Correlation", "Recommendation"])
    return high_pairs, vif_rows


def step11_cluster_features(feature_groups: dict[str, list[str]], feature_meta: dict[str, dict[str, Any]]) -> None:
    section("STEP 11 - FEATURE GROUP CLUSTERS")
    rows = []
    for group in FEATURE_GROUP_ORDER:
        cols = [col for col in feature_groups.get(group, []) if col in feature_meta or col in ORIGINAL_FEATURES]
        sample = ", ".join(cols[:10]) + (" ..." if len(cols) > 10 else "")
        rows.append([group, len(cols), sample])
    print_table(rows, ["Feature group", "Count", "Examples"])

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.bar([row[0] for row in rows], [row[1] for row in rows], color="#B279A2")
    ax.set_title("Feature Count by Group")
    ax.set_xlabel("Feature group")
    ax.set_ylabel("Count")
    ax.tick_params(axis="x", rotation=45)
    save_plot(fig, "feature_group_counts")


def step12_final_inventory(
    work: pd.DataFrame,
    usable_engineered: list[str],
    feature_meta: dict[str, dict[str, Any]],
    rank_df: pd.DataFrame,
    removed_count: int,
    total_engineered_created: int,
) -> list[str]:
    section("STEP 12 - FINAL FEATURE INVENTORY")
    analysis_only = [col for col in usable_engineered if feature_meta.get(col, {}).get("analysis_only", False)]
    usable_for_modeling = [col for col in usable_engineered if col not in analysis_only]
    original_feature_count = len(ORIGINAL_FEATURES)
    final_usable_feature_count = len(NUMERIC_ORIGINAL_FEATURES) + len(usable_for_modeling)

    summary_rows = [
        ["Original feature count", original_feature_count],
        ["Engineered feature count", total_engineered_created],
        ["Removed feature count", removed_count],
        ["Final usable feature count", final_usable_feature_count],
        ["Analysis-only feature count", len(analysis_only)],
    ]
    print_table(summary_rows, ["Inventory item", "Count"])

    print("\nTop 50 most informative features:")
    print_table(rank_df.head(50).values.tolist(), rank_df.head(50).columns.tolist())

    print("\nTop 20 ratio features:")
    ratio_df = rank_df.loc[rank_df["Group"] == "Ratios"].head(20)
    print_table(ratio_df.values.tolist(), ratio_df.columns.tolist())

    print("\nTop 20 interaction features:")
    interaction_df = rank_df.loc[rank_df["Group"] == "Interactions"].head(20)
    print_table(interaction_df.values.tolist(), interaction_df.columns.tolist())

    print("\nTop 20 operational features:")
    operational_df = rank_df.loc[rank_df["Group"] == "Operational indicators"].head(20)
    print_table(operational_df.values.tolist(), operational_df.columns.tolist())

    save_columns = [ID_COL, DATE_COL, TARGET, SHIFT_COL] + NUMERIC_ORIGINAL_FEATURES + usable_engineered
    save_columns = list(dict.fromkeys([col for col in save_columns if col in work.columns]))
    work[save_columns].to_csv(OUTPUT_DATASET_PATH, index=False)
    print(f"\n[dataset saved] {OUTPUT_DATASET_PATH}")
    return usable_for_modeling


def final_banner() -> None:
    section("COMMAND")
    print("python research/phase_16_feature_engineering/feature_engineering.py")


def main() -> None:
    logger = setup_logging()
    logger.info("Loading finalized dataset validated in Phase 14 from %s", DATASET_PATH)
    df = load_dataset(DATASET_PATH)
    work = prepare_working_frame(df)

    feature_groups: dict[str, list[str]] = defaultdict(list)
    feature_meta: dict[str, dict[str, Any]] = {}
    engineered_features: list[str] = []

    step1_keep_original_variables(work)
    engineered_features.extend(create_foundation_features(work, feature_groups, feature_meta))

    for creator in [
        step2_burden_ratio_features,
        step3_interaction_features,
        step4_polynomial_features,
        step5_operational_efficiency_features,
        step6_burden_balance_indicators,
    ]:
        engineered_features.extend(creator(work, feature_groups, feature_meta))

    shift_features, _ = step7_encode_shift(work, feature_groups, feature_meta)
    engineered_features.extend(shift_features)

    engineered_features = list(dict.fromkeys(engineered_features + list(feature_meta.keys())))
    total_engineered_created = len(engineered_features)
    usable_engineered, work = step8_remove_invalid_features(work, engineered_features, feature_groups, feature_meta)
    removed_count = len(engineered_features) - len(usable_engineered)

    rank_df = step9_rank_features(work, usable_engineered, feature_meta)
    step10_multicollinearity(work, usable_engineered, feature_meta)
    step11_cluster_features(feature_groups, feature_meta)
    step12_final_inventory(work, usable_engineered, feature_meta, rank_df, removed_count, total_engineered_created)
    final_banner()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pragma: no cover - defensive terminal reporting
        print(f"\n[ERROR] {exc}")
        raise
