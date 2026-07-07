"""
Phase 13 - Industrial Cleaning.

This script produces the final modeling dataset for Tap-to-Tap Time prediction
from final_master_dataset.csv using industrial process rules rather than
ordinary generic preprocessing.

Outputs:
- final_model_dataset.csv
- cleaning_log.csv

Everything else is printed to the terminal.
"""

from __future__ import annotations

import logging
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from tabulate import tabulate


PHASE_ROOT = Path(__file__).resolve().parent
DATASET_NAME = "final_master_dataset.csv"
FINAL_DATASET_PATH = PHASE_ROOT / "final_model_dataset.csv"
LOG_PATH = PHASE_ROOT / "cleaning_log.csv"

ID_COL = "Heat Number"
DATE_COL = "Date"
SHIFT_COL = "Shift"
TARGET = "TTT"
RAW_COLUMNS = [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "T C", TARGET]
FINAL_COLUMNS = [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "T C", TARGET]

TC_MIN_OPERATIONAL = 80.0
TC_MAX_PHYSICAL = 300.0
POWER_MIN_PHYSICAL = 20000.0
POWER_MAX_PHYSICAL = 100000.0
OXY_MIN_PHYSICAL = 1000.0
OXY_MAX_PHYSICAL = 10000.0
LIME_MAX_PHYSICAL = 50.0
DOLO_MAX_PHYSICAL = 10.0
CPC_MAX_PHYSICAL = 3000.0
BUCKET_MAX_PHYSICAL = 60.0
CHARGE_GAP_MAX_ABS = 10.0

HMS_RE = re.compile(r"^\d{1,2}:\d{2}:\d{2}$")
HM_RE = re.compile(r"^\d{1,2}:\d{2}$")
INT_RE = re.compile(r"^[+-]?\d+$")
FLOAT_RE = re.compile(r"^[+-]?(?:\d+\.\d+|\d+\.)$")
DATETIME_RE = re.compile(
    r"^(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2}) (?P<h>\d{2}):(?P<mi>\d{2}):(?P<s>\d{2})$"
)
NA_TOKENS = {"", " ", "NA", "N/A", "NULL", "NONE", "NAN", "NaN", "na", "null", "none"}


@dataclass
class Decision:
    name: str
    action: str
    count: int
    reason: str
    examples: pd.DataFrame


def setup_logging() -> logging.Logger:
    PHASE_ROOT.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    return logging.getLogger("phase_13")


def section(title: str) -> None:
    print("\n" + "=" * 76)
    print(title)
    print("=" * 76)


def print_table(rows: list[list[Any]], headers: list[str]) -> None:
    print(tabulate(rows, headers=headers, tablefmt="github", floatfmt=".4f"))


def locate_dataset() -> Path:
    candidates = [PHASE_ROOT.parent.parent / DATASET_NAME, Path.cwd() / DATASET_NAME]
    for path in candidates:
        if path.exists():
            return path.resolve()
    raise FileNotFoundError(f"{DATASET_NAME} not found")


def load_dataset(path: Path) -> pd.DataFrame:
    return pd.read_csv(path, usecols=RAW_COLUMNS, low_memory=False)


def is_blank_like(v: Any) -> bool:
    if pd.isna(v):
        return True
    return str(v).strip() in NA_TOKENS


def classify_ttt(v: Any) -> str:
    if is_blank_like(v):
        return "blank"
    s = str(v).strip()
    if s in {"0", "0.0", "00:00", "00:00:00", "00:00:00.0"}:
        return "zero"
    if HMS_RE.fullmatch(s) or HM_RE.fullmatch(s):
        return "duration"
    if INT_RE.fullmatch(s):
        return "integer"
    if FLOAT_RE.fullmatch(s):
        try:
            return "zero" if float(s) == 0 else "integer"
        except ValueError:
            return "invalid"
    match = DATETIME_RE.fullmatch(s)
    if match:
        year = int(match.group("y"))
        hour = int(match.group("h"))
        minute = int(match.group("mi"))
        second = int(match.group("s"))
        if hour == 0 and minute == 0 and second == 0:
            return "zero"
        if year in {1899, 1900}:
            return "excel_datetime"
        return "invalid"
    return "invalid"


def parse_ttt_minutes(v: Any) -> float | None:
    kind = classify_ttt(v)
    if kind in {"blank", "invalid"}:
        return None
    if kind == "zero":
        return 0.0

    s = str(v).strip()
    if HMS_RE.fullmatch(s):
        hh, mm, ss = [int(x) for x in s.split(":")]
        return hh * 60 + mm + ss / 60.0
    if HM_RE.fullmatch(s):
        hh, mm = [int(x) for x in s.split(":")]
        return hh * 60 + mm
    if INT_RE.fullmatch(s) or FLOAT_RE.fullmatch(s):
        return float(s)

    match = DATETIME_RE.fullmatch(s)
    if match:
        hh = int(match.group("h"))
        mm = int(match.group("mi"))
        ss = int(match.group("s"))
        return hh * 60 + mm + ss / 60.0
    return None


def normalize_shift(v: Any) -> str | None:
    if pd.isna(v):
        return None
    text = str(v).strip()
    for ch in text:
        if ch.isalpha():
            ch = ch.upper()
            return ch if ch in {"A", "B", "C"} else None
    return None


def prepare_working_frame(df: pd.DataFrame) -> pd.DataFrame:
    work = df.copy()
    for col in ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", "T C"]:
        work[col] = pd.to_numeric(work[col], errors="coerce")
    work["TTT_kind"] = work[TARGET].map(classify_ttt)
    work["TTT_minutes"] = work[TARGET].map(parse_ttt_minutes)
    work["Shift_clean"] = work[SHIFT_COL].map(normalize_shift)
    work["Charge_Gap_No_HBI"] = work[["HM", "DRI", "Bucket"]].fillna(0).sum(axis=1) - work["T C"]
    work["Charge_Gap_No_Bucket"] = work[["HM", "DRI", "HBI"]].fillna(0).sum(axis=1) - work["T C"]
    return work


def example_df(df: pd.DataFrame, mask: pd.Series, cols: list[str], limit: int = 5) -> pd.DataFrame:
    return df.loc[mask, cols].head(limit).replace({np.nan: "NA"}).copy()


def print_decision(decision: Decision) -> None:
    print(f"\n{decision.name}")
    print(f"Decision: {decision.action}")
    print(f"Affected rows: {decision.count}")
    print(f"Reason: {decision.reason}")
    if decision.count > 0 and not decision.examples.empty:
        print("Examples:")
        print_table(decision.examples.values.tolist(), decision.examples.columns.tolist())


def build_decisions(work: pd.DataFrame) -> list[Decision]:
    close_gap = lambda frame: (
        frame[["HM", "DRI", "HBI", "Bucket"]].fillna(0).sum(axis=1) - frame["T C"]
    ).abs().le(CHARGE_GAP_MAX_ABS)

    high_hm_keep = work["HM"].gt(80) & work["HM"].le(work["T C"]) & work["T C"].between(80, 170) & close_gap(work)
    high_dri_keep = work["DRI"].gt(80) & work["DRI"].le(work["T C"]) & work["T C"].between(80, 170) & close_gap(work)
    large_bucket_keep = work["Bucket"].gt(40) & close_gap(work)
    shutdown_keep = work["TTT_minutes"].gt(180)
    shift_correct = work["Shift_clean"].notna() & (
        work[SHIFT_COL].astype("string").str.strip() != work["Shift_clean"]
    )
    hbi_impute = work["HBI"].isna() & work["Charge_Gap_No_HBI"].abs().le(5) & work["T C"].between(80, 160)
    bucket_impute = work["Bucket"].isna() & work["Charge_Gap_No_Bucket"].abs().le(5) & work["T C"].between(80, 160)

    return [
        Decision(
            name="High HM Heats",
            action="KEEP",
            count=int(high_hm_keep.sum()),
            reason="Large hot metal heats occasionally occur and are retained when total charge and burden closure remain physically consistent.",
            examples=example_df(work, high_hm_keep, [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "Bucket", "T C", TARGET]),
        ),
        Decision(
            name="High DRI Heats",
            action="KEEP",
            count=int(high_dri_keep.sum()),
            reason="High DRI heats are retained when they still close the charge balance and remain within a plausible total charge envelope.",
            examples=example_df(work, high_dri_keep, [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "Bucket", "T C", TARGET]),
        ),
        Decision(
            name="Large Bucket Heats",
            action="KEEP",
            count=int(large_bucket_keep.sum()),
            reason="Large scrap bucket values can be real if the full burden still closes against total charge.",
            examples=example_df(work, large_bucket_keep, [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "Bucket", "T C", TARGET]),
        ),
        Decision(
            name="Shutdown-like / Long-delay Heats",
            action="KEEP and FLAG",
            count=int(shutdown_keep.sum()),
            reason="Very large TTT values represent real operational interruptions. They are retained for robustness and future two-stage modeling, not deleted.",
            examples=example_df(work, shutdown_keep, [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "POWER", "OXY", "T C", TARGET]),
        ),
        Decision(
            name="Shift Labels with Clear Alpha Prefix",
            action="CORRECT",
            count=int(shift_correct.sum()),
            reason="Shift labels such as A1, B10, c3 are standardized to A, B, C because the alpha prefix carries the actual shift identity.",
            examples=example_df(work.assign(Shift_corrected=work["Shift_clean"]), shift_correct, [ID_COL, DATE_COL, SHIFT_COL, "Shift_corrected", "T C", TARGET]),
        ),
        Decision(
            name="Missing HBI with Proven Non-use",
            action="IMPUTE",
            count=int(hbi_impute.sum()),
            reason="HBI is replaced with 0 only when HM + DRI + Bucket already closes the total charge, proving HBI was not required in that heat.",
            examples=example_df(work, hbi_impute, [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "HBI", "Bucket", "T C", TARGET]),
        ),
        Decision(
            name="Missing Bucket with Proven Zero Scrap",
            action="IMPUTE",
            count=int(bucket_impute.sum()),
            reason="Bucket is replaced with 0 only when HM + DRI + HBI already closes the total charge, proving no additional scrap bucket is needed.",
            examples=example_df(work, bucket_impute, [ID_COL, DATE_COL, SHIFT_COL, "HM", "DRI", "HBI", "Bucket", "T C", TARGET]),
        ),
        Decision(
            name="Extreme Lime Additions",
            action="REMOVE",
            count=int(work["LIME"].gt(LIME_MAX_PHYSICAL).sum()),
            reason="LIME values above 50 t are industrially impossible for a single EAF heat. Decimal-shift corrections are possible (e.g. 974 -> 9.74 or 97.4) but cannot be proven automatically, so these rows are excluded.",
            examples=example_df(work, work["LIME"].gt(LIME_MAX_PHYSICAL), [ID_COL, DATE_COL, SHIFT_COL, "LIME", "T C", TARGET]),
        ),
        Decision(
            name="Extreme Dolomite Additions",
            action="REMOVE",
            count=int(work["DOLO"].gt(DOLO_MAX_PHYSICAL).sum()),
            reason="DOLO values above 10 t are inconsistent with normal slag practice and are excluded rather than auto-corrected.",
            examples=example_df(work, work["DOLO"].gt(DOLO_MAX_PHYSICAL), [ID_COL, DATE_COL, SHIFT_COL, "DOLO", "T C", TARGET]),
        ),
        Decision(
            name="Extreme CPC Values",
            action="REMOVE",
            count=int(work["CPC"].gt(CPC_MAX_PHYSICAL).sum()),
            reason="CPC spikes above 3000 are not treated as trustworthy carbon-injection measurements without independent confirmation.",
            examples=example_df(work, work["CPC"].gt(CPC_MAX_PHYSICAL), [ID_COL, DATE_COL, SHIFT_COL, "CPC", "T C", TARGET]),
        ),
        Decision(
            name="Invalid or Placeholder Targets",
            action="REMOVE",
            count=int(work["TTT_minutes"].isna().sum() + work["TTT_minutes"].eq(0).sum()),
            reason="Blank, invalid, or zero-minute TTT values cannot serve as a valid supervised target.",
            examples=example_df(work, work["TTT_minutes"].isna() | work["TTT_minutes"].eq(0), [ID_COL, DATE_COL, SHIFT_COL, "T C", TARGET]),
        ),
    ]


def apply_corrections_and_imputations(work: pd.DataFrame) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    log_rows: list[dict[str, Any]] = []
    cleaned = work.copy()

    shift_correct_mask = cleaned["Shift_clean"].notna() & (
        cleaned[SHIFT_COL].astype("string").str.strip() != cleaned["Shift_clean"]
    )
    cleaned.loc[shift_correct_mask, SHIFT_COL] = cleaned.loc[shift_correct_mask, "Shift_clean"]
    log_rows.append(
        {
            "stage": "correction",
            "action": "CORRECT",
            "rule": "Normalize Shift labels to A/B/C",
            "rows_affected": int(shift_correct_mask.sum()),
            "reason": "Resolved shift code from alpha prefix.",
        }
    )

    hbi_impute_mask = cleaned["HBI"].isna() & cleaned["Charge_Gap_No_HBI"].abs().le(5) & cleaned["T C"].between(80, 160)
    cleaned.loc[hbi_impute_mask, "HBI"] = 0.0
    log_rows.append(
        {
            "stage": "imputation",
            "action": "IMPUTE",
            "rule": "Set HBI=0 when charge balance proves non-use",
            "rows_affected": int(hbi_impute_mask.sum()),
            "reason": "HM + DRI + Bucket already closes total charge.",
        }
    )

    bucket_impute_mask = cleaned["Bucket"].isna() & cleaned["Charge_Gap_No_Bucket"].abs().le(5) & cleaned["T C"].between(80, 160)
    cleaned.loc[bucket_impute_mask, "Bucket"] = 0.0
    log_rows.append(
        {
            "stage": "imputation",
            "action": "IMPUTE",
            "rule": "Set Bucket=0 when charge balance proves zero scrap bucket",
            "rows_affected": int(bucket_impute_mask.sum()),
            "reason": "HM + DRI + HBI already closes total charge.",
        }
    )

    cleaned["Charge_Gap"] = cleaned[["HM", "DRI", "HBI", "Bucket"]].fillna(0).sum(axis=1) - cleaned["T C"]
    return cleaned, log_rows


def sequential_remove(cleaned: pd.DataFrame) -> tuple[pd.DataFrame, list[dict[str, Any]]]:
    active = pd.Series(True, index=cleaned.index)
    removed_reason = pd.Series("", index=cleaned.index, dtype="string")
    removed_action = pd.Series("", index=cleaned.index, dtype="string")
    removed_records: list[dict[str, Any]] = []

    rules = [
        (
            "Blank or duplicate Heat Number",
            cleaned[ID_COL].isna() | cleaned[ID_COL].astype("string").str.strip().eq("") | cleaned[ID_COL].duplicated(keep=False),
            "REMOVE",
            "Heat identity must be unique and nonblank for a modeling record.",
        ),
        (
            "Invalid / blank / zero TTT",
            cleaned["TTT_minutes"].isna() | cleaned["TTT_minutes"].le(0),
            "REMOVE",
            "Target is not usable for supervised learning.",
        ),
        (
            "Total charge outside industrial envelope",
            cleaned["T C"].isna() | cleaned["T C"].lt(TC_MIN_OPERATIONAL) | cleaned["T C"].gt(TC_MAX_PHYSICAL),
            "REMOVE",
            "Total charge below 80 t looks like partial/incomplete heat data; above 300 t is physically impossible.",
        ),
        (
            "HM greater than total charge",
            cleaned["HM"].gt(cleaned["T C"]) & cleaned["T C"].gt(0),
            "REMOVE",
            "Hot metal cannot exceed the reported total charge.",
        ),
        (
            "DRI greater than total charge",
            cleaned["DRI"].gt(cleaned["T C"]) & cleaned["T C"].gt(0),
            "REMOVE",
            "DRI cannot exceed the reported total charge.",
        ),
        (
            "POWER outside physical envelope",
            cleaned["POWER"].isna() | cleaned["POWER"].lt(POWER_MIN_PHYSICAL) | cleaned["POWER"].gt(POWER_MAX_PHYSICAL),
            "REMOVE",
            "Total electrical energy must remain within a physically plausible heat-level envelope.",
        ),
        (
            "OXY outside physical envelope",
            cleaned["OXY"].isna() | cleaned["OXY"].lt(OXY_MIN_PHYSICAL) | cleaned["OXY"].gt(OXY_MAX_PHYSICAL),
            "REMOVE",
            "Total oxygen must remain within a physically plausible heat-level envelope.",
        ),
        (
            "LIME missing or impossible",
            cleaned["LIME"].isna() | cleaned["LIME"].le(0) | cleaned["LIME"].gt(LIME_MAX_PHYSICAL),
            "REMOVE",
            "Lime must be present and within industrial flux practice.",
        ),
        (
            "DOLO missing or impossible",
            cleaned["DOLO"].isna() | cleaned["DOLO"].lt(0) | cleaned["DOLO"].gt(DOLO_MAX_PHYSICAL),
            "REMOVE",
            "Dolomite must be present and within industrial flux practice.",
        ),
        (
            "CPC missing or impossible",
            cleaned["CPC"].isna() | cleaned["CPC"].lt(0) | cleaned["CPC"].gt(CPC_MAX_PHYSICAL),
            "REMOVE",
            "Carbon injection must be present and within industrial practice.",
        ),
        (
            "Bucket impossible",
            cleaned["Bucket"].lt(0) | cleaned["Bucket"].gt(BUCKET_MAX_PHYSICAL),
            "REMOVE",
            "Scrap bucket amount cannot be negative and must stay within a plausible charge contribution.",
        ),
        (
            "Unresolved Shift label",
            cleaned[SHIFT_COL].map(normalize_shift).isna(),
            "REMOVE",
            "Shift could not be safely corrected to A/B/C.",
        ),
        (
            "Charge balance mismatch > 10 t",
            cleaned["Charge_Gap"].abs().gt(CHARGE_GAP_MAX_ABS),
            "REMOVE",
            "HM + DRI + HBI + Bucket must stay close to total charge for a trustworthy full-heat record.",
        ),
        (
            "Missing HM or DRI after industrial checks",
            cleaned["HM"].isna() | cleaned["DRI"].isna(),
            "REMOVE",
            "Core burden components are unresolved, so the recipe is incomplete for modeling.",
        ),
    ]

    for rule_name, mask, action, reason in rules:
        step_mask = active & mask.fillna(False)
        removed_count = int(step_mask.sum())
        if removed_count > 0:
            active.loc[step_mask] = False
            removed_reason.loc[step_mask] = rule_name
            removed_action.loc[step_mask] = action
        removed_records.append(
            {
                "stage": "removal",
                "action": action,
                "rule": rule_name,
                "rows_affected": removed_count,
                "reason": reason,
            }
        )

    kept = cleaned.loc[active].copy()
    kept[TARGET] = kept["TTT_minutes"]
    kept[SHIFT_COL] = kept[SHIFT_COL].astype("string").str.strip()
    kept = kept[FINAL_COLUMNS].copy()
    return kept, removed_records


def summarize_final_dataset(df: pd.DataFrame) -> None:
    section("STEP 4 - FINAL MODELLING DATASET SUMMARY")
    rows = [
        ["Rows", len(df)],
        ["Columns", len(df.columns)],
    ]
    print_table(rows, ["Metric", "Value"])

    missing_rows = [[col, int(df[col].isna().sum())] for col in df.columns]
    print("\nMissing values:")
    print_table(missing_rows, ["Column", "Missing"])

    ttt = pd.to_numeric(df[TARGET], errors="coerce")
    target_rows = [
        ["Minimum", float(ttt.min())],
        ["Maximum", float(ttt.max())],
        ["Mean", float(ttt.mean())],
        ["Median", float(ttt.median())],
        ["P95", float(ttt.quantile(0.95))],
        ["P99", float(ttt.quantile(0.99))],
    ]
    print("\nTarget statistics:")
    print_table(target_rows, ["Metric", "Value"])

    charge_gap = df[["HM", "DRI", "HBI", "Bucket"]].fillna(0).sum(axis=1) - df["T C"]
    charge_rows = [
        ["Minimum gap", float(charge_gap.min())],
        ["Maximum gap", float(charge_gap.max())],
        ["Median gap", float(charge_gap.median())],
        ["Rows within +/-5 t", int(charge_gap.abs().le(5).sum())],
        ["Rows within +/-10 t", int(charge_gap.abs().le(10).sum())],
    ]
    print("\nCharge balance:")
    print_table(charge_rows, ["Metric", "Value"])

    for col in ["HM", "DRI", "POWER", "OXY"]:
        s = pd.to_numeric(df[col], errors="coerce")
        rows = [
            ["Minimum", float(s.min())],
            ["P1", float(s.quantile(0.01))],
            ["Median", float(s.median())],
            ["P99", float(s.quantile(0.99))],
            ["Maximum", float(s.max())],
        ]
        print(f"\n{col} distribution:")
        print_table(rows, ["Metric", "Value"])


def write_cleaning_log(log_records: list[dict[str, Any]], final_rows: int, removed_rows: int, corrected_rows: int, imputed_rows: int, flagged_rows: int) -> None:
    log_df = pd.DataFrame(log_records)
    summary_rows = pd.DataFrame(
        [
            {
                "stage": "summary",
                "action": "INFO",
                "rule": "Final rows",
                "rows_affected": final_rows,
                "reason": "Rows retained in final_model_dataset.csv",
            },
            {
                "stage": "summary",
                "action": "INFO",
                "rule": "Rows removed",
                "rows_affected": removed_rows,
                "reason": "Total rows excluded by industrial cleaning rules",
            },
            {
                "stage": "summary",
                "action": "INFO",
                "rule": "Rows corrected",
                "rows_affected": corrected_rows,
                "reason": "Rows with safe deterministic corrections applied",
            },
            {
                "stage": "summary",
                "action": "INFO",
                "rule": "Rows imputed",
                "rows_affected": imputed_rows,
                "reason": "Rows with industrially justified imputations applied",
            },
            {
                "stage": "summary",
                "action": "INFO",
                "rule": "Rows flagged and kept",
                "rows_affected": flagged_rows,
                "reason": "Rows intentionally retained despite long delays or unusual but plausible burden practice",
            },
        ]
    )
    out = pd.concat([log_df, summary_rows], ignore_index=True)
    out.to_csv(LOG_PATH, index=False)


def print_step3_log(
    log_records: list[dict[str, Any]],
    final_rows: int,
    removed_rows: int,
    corrected_rows: int,
    imputed_rows: int,
    flagged_rows: int,
) -> None:
    section("STEP 3 - CLEANING LOG")
    rows = [[r["stage"], r["action"], r["rule"], r["rows_affected"], r["reason"]] for r in log_records]
    print_table(rows, ["Stage", "Action", "Rule", "Rows", "Reason"])

    summary = [
        ["Rows removed (unique)", removed_rows],
        ["Rows kept", final_rows],
        ["Rows imputed", imputed_rows],
        ["Rows corrected", corrected_rows],
        ["Rows flagged and kept", flagged_rows],
        ["Final dataset size", final_rows],
    ]
    print("\nCleaning summary:")
    print_table(summary, ["Metric", "Value"])


def final_readiness(df: pd.DataFrame) -> str:
    core_cols = [col for col in df.columns if col != DATE_COL]
    ready = (
        int(df[ID_COL].duplicated().sum()) == 0
        and int(df[core_cols].isna().sum().sum()) == 0
        and bool(df[TARGET].gt(0).all())
    )
    return "FINAL DATASET READY FOR FEATURE ENGINEERING" if ready else "MORE MANUAL REVIEW REQUIRED"


def main() -> None:
    logger = setup_logging()
    dataset_path = locate_dataset()
    logger.info("Loading raw dataset from %s", dataset_path)

    raw = load_dataset(dataset_path)
    work = prepare_working_frame(raw)

    section("STEP 1 - INDUSTRIAL DECISION REGISTER")
    decisions = build_decisions(work)
    for decision in decisions:
        print_decision(decision)

    corrected, correction_log = apply_corrections_and_imputations(work)
    final_df, removal_log = sequential_remove(corrected)

    removed_rows = len(raw) - len(final_df)
    corrected_rows = sum(r["rows_affected"] for r in correction_log if r["action"] == "CORRECT")
    imputed_rows = sum(r["rows_affected"] for r in correction_log if r["action"] == "IMPUTE")
    keep_flagged_rows = int(final_df[TARGET].gt(180).sum())
    decision_log = [
        {
            "stage": "decision",
            "action": d.action,
            "rule": d.name,
            "rows_affected": d.count,
            "reason": d.reason,
        }
        for d in decisions
    ]
    log_records = decision_log + correction_log + removal_log

    section("STEP 2 - APPLIED INDUSTRIAL CLEANING RULES")
    removal_rows = [
        [r["rule"], r["rows_affected"], r["reason"]]
        for r in removal_log
        if r["rows_affected"] > 0
    ]
    print_table(removal_rows, ["Removal rule", "Rows removed", "Reason"])

    print_step3_log(
        log_records,
        final_rows=len(final_df),
        removed_rows=removed_rows,
        corrected_rows=corrected_rows,
        imputed_rows=imputed_rows,
        flagged_rows=keep_flagged_rows,
    )
    summarize_final_dataset(final_df)

    final_df.to_csv(FINAL_DATASET_PATH, index=False)
    write_cleaning_log(
        log_records=log_records,
        final_rows=len(final_df),
        removed_rows=removed_rows,
        corrected_rows=corrected_rows,
        imputed_rows=imputed_rows,
        flagged_rows=keep_flagged_rows,
    )

    section("FINAL STATUS")
    print(final_readiness(final_df))
    if int(final_df[DATE_COL].isna().sum()) > 0:
        print(f"Note: `{DATE_COL}` still has {int(final_df[DATE_COL].isna().sum())} missing values, but all core modeling variables are complete.")

    print("\nCommand to run:")
    print("python research/phase_13_industrial_cleaning/industrial_cleaning.py")


if __name__ == "__main__":
    try:    
        main()
    except Exception as exc:  # pragma: no cover - defensive reporting
        print(f"\n[ERROR] {exc}")
        raise
