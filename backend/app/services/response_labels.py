"""User-facing labels for API responses — internal field names stay unchanged."""

from __future__ import annotations

import re
from typing import Any

ELECTRICAL_ENERGY_LABEL = "Electrical Energy (kWh)"

FEATURE_DISPLAY_NAMES: dict[str, str] = {
    "HM": "Hot metal (HM)",
    "DRI": "Direct reduced iron (DRI)",
    "HBI": "Hot briquetted iron (HBI)",
    "Bucket": "Scrap buckets",
    "LIME": "Lime (flux)",
    "DOLO": "Dolomite (flux)",
    "CPC": "Carbon program (CPC)",
    "POWER": ELECTRICAL_ENERGY_LABEL,
    "OXY": "Oxygen program (OXY)",
    "HM_X_POWER": "Hot metal × Electrical Energy",
    "POWER_PER_TONNE": "Electrical Energy / Tonne",
    "BUCKET_X_CPC": "Scrap buckets × Carbon program",
    "OXYGEN_PER_TONNE": "Oxygen / Tonne",
    "SOLID_BURDEN_RATIO": "Solid burden ratio",
    "HM_TO_DRI_RATIO": "Hot metal / DRI ratio",
    "BURDEN_SHARE_RANGE": "Burden share range",
    "HM_TO_BUCKET_RATIO": "Hot metal / scrap ratio",
    "BUCKET_X_DOLO": "Scrap buckets × Dolomite",
    "CPC_X_DRI": "Carbon program × DRI",
    "FLUX_PER_TONNE": "Flux / Tonne",
    "FLUX_TO_CARBON_RATIO": "Flux / Carbon ratio",
    "DOLO_X_LIME": "Dolomite × Lime",
    "DOLO_SQ": "Dolomite squared",
    "CPC_X_HBI": "Carbon program × HBI",
    "DRI_TO_HBI_RATIO": "DRI / HBI ratio",
    "BUCKET_X_HBI": "Scrap buckets × HBI",
    "DOLO_X_HBI": "Dolomite × HBI",
    "HBI_SQ": "HBI squared",
    "SHIFT_LABEL": "Shift label",
    "SHIFT_C": "Shift C",
    "CHARGE_BALANCE_ERROR": "Charge balance error",
    "FLUX": "Flux (lime + dolomite)",
    "Total_Charge": "Total charge (t)",
}

GAUGE_LABELS: dict[str, str] = {
    "Power": ELECTRICAL_ENERGY_LABEL,
    "Oxygen": "Oxygen",
    "HM": "Hot metal",
    "DRI": "Direct reduced iron",
    "Bucket": "Scrap buckets",
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


_CODE_TO_PLAIN = (
    ("historical P95", "the usual high end for this plant"),
    ("historical P5", "the usual low end for this plant"),
    ("P5–P95", "the common plant range"),
    ("P5-P95", "the common plant range"),
    ("5th percentile", "usual low end"),
    ("95th percentile", "usual high end"),
    ("POWER", ELECTRICAL_ENERGY_LABEL),
    ("Power/Tonne", "Electrical Energy / Tonne"),
    ("Power ", "Electrical Energy "),
    ("DOLO", "Dolomite (flux)"),
    ("LIME", "Lime (flux)"),
    ("HBI", "Hot briquetted iron (HBI)"),
    ("DRI", "Direct reduced iron (DRI)"),
    ("HM", "Hot metal (HM)"),
    ("CPC", "Carbon program"),
    ("OXY", "Oxygen program"),
)


def relabel_warning_message(message: str) -> str:
    out = message
    for old, new in _CODE_TO_PLAIN:
        out = out.replace(old, new)
    return out
