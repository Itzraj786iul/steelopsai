"""User-facing labels for API responses — internal field names stay unchanged."""

from __future__ import annotations

import re
from typing import Any

ELECTRICAL_ENERGY_LABEL = "Electrical Energy (kWh)"

FEATURE_DISPLAY_NAMES: dict[str, str] = {
    "POWER": ELECTRICAL_ENERGY_LABEL,
    "HM_X_POWER": "HM × Electrical Energy",
    "POWER_PER_TONNE": "Electrical Energy / Tonne",
    "BUCKET_X_CPC": "Bucket × CPC",
    "OXYGEN_PER_TONNE": "Oxygen / Tonne",
    "SOLID_BURDEN_RATIO": "Solid Burden Ratio",
    "HM_TO_DRI_RATIO": "HM / DRI Ratio",
    "BURDEN_SHARE_RANGE": "Burden Share Range",
    "HM_TO_BUCKET_RATIO": "HM / Bucket Ratio",
    "BUCKET_X_DOLO": "Bucket × DOLO",
    "CPC_X_DRI": "CPC × DRI",
    "FLUX_PER_TONNE": "Flux / Tonne",
    "FLUX_TO_CARBON_RATIO": "Flux / Carbon Ratio",
    "DOLO_X_LIME": "DOLO × LIME",
    "DOLO_SQ": "DOLO Squared",
    "CPC_X_HBI": "CPC × HBI",
    "DRI_TO_HBI_RATIO": "DRI / HBI Ratio",
    "BUCKET_X_HBI": "Bucket × HBI",
    "DOLO_X_HBI": "DOLO × HBI",
    "HBI_SQ": "HBI Squared",
    "SHIFT_LABEL": "Shift Label",
    "SHIFT_C": "Shift C",
    "CHARGE_BALANCE_ERROR": "Charge Balance Error",
    "FLUX": "Flux (LIME + DOLO)",
    "Total_Charge": "Total Charge (t)",
}

GAUGE_LABELS: dict[str, str] = {
    "Power": ELECTRICAL_ENERGY_LABEL,
    "Oxygen": "Oxygen",
    "HM": "HM",
    "DRI": "DRI",
    "Bucket": "Bucket",
    "Flux": "Flux",
}

_POWER_WORD = re.compile(r"\bpower\b", re.IGNORECASE)


def format_display_name(key: str, fallback: str | None = None) -> str:
    if key in FEATURE_DISPLAY_NAMES:
        return FEATURE_DISPLAY_NAMES[key]
    source = fallback or key.replace("_", " ")
    if _POWER_WORD.search(source):
        return _POWER_WORD.sub("Electrical Energy", source)
    return source


def relabel_contributor(item: dict[str, Any]) -> dict[str, Any]:
    feature = str(item.get("feature", ""))
    return {
        **item,
        "display_name": format_display_name(feature, str(item.get("display_name", feature))),
    }


def relabel_comparison_row(row: dict[str, Any]) -> dict[str, Any]:
    variable = str(row.get("variable", ""))
    return {
        **row,
        "variable": variable,
        "display_name": format_display_name(variable),
    }


def relabel_historical_variable(row: dict[str, Any]) -> dict[str, Any]:
    variable = str(row.get("variable", ""))
    return {
        **row,
        "variable": variable,
        "display_name": format_display_name(variable),
    }


def relabel_process_health_item(item: dict[str, Any]) -> dict[str, Any]:
    gauge = str(item.get("gauge", ""))
    return {
        **item,
        "gauge": gauge,
        "display_name": GAUGE_LABELS.get(gauge, gauge),
    }


def relabel_warning_message(message: str) -> str:
    return (
        message.replace("POWER", ELECTRICAL_ENERGY_LABEL)
        .replace("Power/Tonne", "Electrical Energy / Tonne")
        .replace("Power ", "Electrical Energy ")
    )
