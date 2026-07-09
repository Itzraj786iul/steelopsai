"""Phase 33 — local validation and operator feedback store (research only, no model retraining)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "phase_33"
VALIDATION_FILE = DATA_DIR / "validation_results.json"
FEEDBACK_FILE = DATA_DIR / "operator_feedback.json"


def _ensure() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load(path: Path) -> list[dict[str, Any]]:
    _ensure()
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _save(path: Path, rows: list[dict[str, Any]]) -> None:
    _ensure()
    path.write_text(json.dumps(rows, indent=2, default=str), encoding="utf-8")


def list_validation() -> list[dict[str, Any]]:
    return _load(VALIDATION_FILE)


def add_validation(entry: dict[str, Any]) -> dict[str, Any]:
    rows = _load(VALIDATION_FILE)
    entry = {**entry, "recorded_at": datetime.now(timezone.utc).isoformat()}
    rows.append(entry)
    _save(VALIDATION_FILE, rows)
    return entry


def validation_metrics() -> dict[str, Any]:
    rows = _load(VALIDATION_FILE)
    diffs = [
        abs(float(r["actual_ttt"]) - float(r["predicted_ttt"]))
        for r in rows
        if r.get("actual_ttt") not in (None, "", "Pending")
        and r.get("predicted_ttt") is not None
    ]
    if not diffs:
        return {"count": len(rows), "mae": None, "rmse": None, "bias": None, "mape": None}
    import math

    errors = [
        float(r["actual_ttt"]) - float(r["predicted_ttt"])
        for r in rows
        if r.get("actual_ttt") not in (None, "", "Pending")
    ]
    mae = sum(abs(e) for e in errors) / len(errors)
    rmse = math.sqrt(sum(e * e for e in errors) / len(errors))
    bias = sum(errors) / len(errors)
    mape_vals = [
        abs(e) / max(float(r["actual_ttt"]), 1e-6) * 100
        for r, e in zip(
            [x for x in rows if x.get("actual_ttt") not in (None, "", "Pending")],
            errors,
        )
    ]
    mape = sum(mape_vals) / len(mape_vals) if mape_vals else None
    return {"count": len(rows), "mae": round(mae, 3), "rmse": round(rmse, 3), "bias": round(bias, 3), "mape": round(mape, 2) if mape else None}


def list_feedback() -> list[dict[str, Any]]:
    return _load(FEEDBACK_FILE)


def add_feedback(entry: dict[str, Any]) -> dict[str, Any]:
    rows = _load(FEEDBACK_FILE)
    entry = {**entry, "recorded_at": datetime.now(timezone.utc).isoformat()}
    rows.append(entry)
    _save(FEEDBACK_FILE, rows)
    return entry


def feedback_summary() -> dict[str, Any]:
    rows = _load(FEEDBACK_FILE)
    if not rows:
        return {"total": 0, "accepted": 0, "modified": 0, "rejected": 0, "acceptance_rate_pct": None}
    counts = {"Accepted": 0, "Modified": 0, "Rejected": 0}
    for r in rows:
        status = r.get("status", "")
        if status in counts:
            counts[status] += 1
    total = len(rows)
    return {
        "total": total,
        "accepted": counts["Accepted"],
        "modified": counts["Modified"],
        "rejected": counts["Rejected"],
        "acceptance_rate_pct": round(100 * counts["Accepted"] / total, 1) if total else None,
    }
