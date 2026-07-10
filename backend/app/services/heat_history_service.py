"""Heat History service — CRUD, filters, analytics, exports.

Wraps existing production results. Does not call or modify ML engines.
"""

from __future__ import annotations

import csv
import io
import math
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any, Literal

from app.services.heat_db import dumps, get_connection, row_to_dict

HeatStatus = Literal[
    "Draft",
    "Predicted",
    "Optimized",
    "Accepted",
    "Running",
    "Completed",
    "Validated",
    "Archived",
]

STATUS_ORDER = [
    "Draft",
    "Predicted",
    "Optimized",
    "Accepted",
    "Running",
    "Completed",
    "Validated",
    "Archived",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None = None) -> str:
    return (dt or _now()).isoformat()


def _date_str(dt: datetime | None = None) -> str:
    return (dt or _now()).date().isoformat()


def _time_str(dt: datetime | None = None) -> str:
    return (dt or _now()).strftime("%H:%M:%S")


def _advance_status(current: str | None, target: str) -> str:
    cur = current or "Draft"
    try:
        if STATUS_ORDER.index(target) >= STATUS_ORDER.index(cur):
            return target
    except ValueError:
        return target
    return cur


def upsert_from_prediction(payload: dict[str, Any]) -> dict[str, Any]:
    """Create or update a heat after a successful prediction."""
    heat_number = (payload.get("heat_number") or "").strip() or f"AUTO-{uuid.uuid4().hex[:8].upper()}"
    session_id = payload.get("session_id") or ""
    recipe = payload.get("recipe_inputs") or payload.get("recipe") or {}
    prediction = payload.get("prediction") or {}
    hybrid = payload.get("hybrid") or {}

    existing = _find_active(heat_number=heat_number, session_id=session_id)
    now = _now()
    record_id = existing["id"] if existing else str(uuid.uuid4())

    sim = (
        prediction.get("explainability", {}) or {}
    ).get("historical_similarity_pct")
    if sim is None:
        heats = (prediction.get("explainability", {}) or {}).get("similar_heats") or []
        if heats:
            sim = heats[0].get("similarity_pct")

    fields = {
        "id": record_id,
        "heat_number": heat_number,
        "date": existing["date"] if existing else _date_str(now),
        "time": existing["time"] if existing else _time_str(now),
        "shift": str(recipe.get("Shift") or payload.get("shift") or "B").upper()[:1],
        "status": _advance_status(existing["status"] if existing else None, "Predicted"),
        "operator_name": payload.get("operator_name") or (existing or {}).get("operator_name") or "",
        "operator_id": payload.get("operator_id") or (existing or {}).get("operator_id") or "",
        "recipe_json": dumps(recipe),
        "hm": _f(recipe.get("HM")),
        "dri": _f(recipe.get("DRI")),
        "hbi": _f(recipe.get("HBI")),
        "bucket": _f(recipe.get("Bucket")),
        "lime": _f(recipe.get("LIME")),
        "dolo": _f(recipe.get("DOLO")),
        "cpc": _f(recipe.get("CPC")),
        "oxy": _f(recipe.get("OXY")),
        "electrical_energy_kwh": _f(recipe.get("POWER")),
        "target_oxygen_program": _f(payload.get("Target_Oxygen_Program") or recipe.get("Target_Oxygen_Program")),
        "target_carbon_program": _f(payload.get("Target_Carbon_Program") or recipe.get("Target_Carbon_Program")),
        "power_restriction": int(recipe.get("Power_Restriction") or 0),
        "predicted_ttt": _f(prediction.get("predicted_ttt")),
        "prediction_interval_low": _f(prediction.get("ci_lower_95")),
        "prediction_interval_high": _f(prediction.get("ci_upper_95")),
        "confidence": prediction.get("confidence")
        or (prediction.get("operator_summary") or {}).get("confidence"),
        "historical_similarity": _f(sim),
        "risk_level": (prediction.get("explainability") or {}).get("industrial_risk"),
        "reliability_index": _f(hybrid.get("reliability_index")),
        "physics_confidence": _f(hybrid.get("physics_confidence")),
        "industrial_confidence": _f(hybrid.get("industrial_confidence")),
        "ai_confidence": _f(hybrid.get("ai_confidence")),
        "consensus": hybrid.get("consensus"),
        "explainability_json": dumps(prediction.get("explainability")),
        "session_id": session_id or (existing or {}).get("session_id") or "",
        "furnace_id": payload.get("furnace_id") or (existing or {}).get("furnace_id") or "EAF-1",
        "plant": payload.get("plant") or (existing or {}).get("plant") or "JSPL",
        "supervisor_id": payload.get("supervisor_id") or (existing or {}).get("supervisor_id") or "",
        "predicted_by": payload.get("predicted_by")
        or payload.get("operator_id")
        or (existing or {}).get("predicted_by")
        or "",
        "created_at": existing["created_at"] if existing else _iso(now),
        "updated_at": _iso(now),
    }

    if existing:
        _update(record_id, fields)
    else:
        _insert(fields)
    return get_heat(record_id)  # type: ignore[return-value]


def update_from_optimizer(payload: dict[str, Any]) -> dict[str, Any] | None:
    heat_number = (payload.get("heat_number") or "").strip()
    session_id = payload.get("session_id") or ""
    existing = _find_active(heat_number=heat_number, session_id=session_id)
    if not existing:
        # Create from optimizer if prediction save was skipped
        if payload.get("recipe_inputs") or payload.get("recipe"):
            base = upsert_from_prediction(
                {
                    **payload,
                    "prediction": {
                        "predicted_ttt": (payload.get("optimizer") or {}).get("current_ttt"),
                        "ci_lower_95": None,
                        "ci_upper_95": None,
                        "confidence": None,
                    },
                }
            )
            existing = {"id": base["id"], "status": base["status"], "created_at": base["created_at"], "date": base["date"], "time": base["time"], "operator_name": base.get("operator_name"), "session_id": base.get("session_id")}
        else:
            return None

    opt = payload.get("optimizer") or {}
    v2 = payload.get("optimizer_v2") or {}
    patch: dict[str, Any] = {
        "status": _advance_status(existing["status"], "Optimized"),
        "updated_at": _iso(),
    }
    if opt:
        patch.update(
            {
                "optimized_recipe_json": dumps(opt.get("optimized_recipe")),
                "optimized_ttt": _f(opt.get("optimized_ttt")),
                "expected_saving": _f(opt.get("improvement_min")),
                "optimizer_result_json": dumps(opt),
            }
        )
    if v2:
        patch.update(
            {
                "v2_recipe_json": dumps(v2.get("optimized_recipe")),
                "v2_ttt": _f(v2.get("optimized_ttt")),
                "v2_saving": _f(v2.get("improvement_min")),
            }
        )
    if payload.get("recommendation_status"):
        patch["recommendation_status"] = payload["recommendation_status"]
        if payload["recommendation_status"] == "Accepted":
            patch["status"] = _advance_status(patch["status"], "Accepted")
    if payload.get("optimized_by"):
        patch["optimized_by"] = payload["optimized_by"]
    if payload.get("approved_by"):
        patch["approved_by"] = payload["approved_by"]

    _update(existing["id"], patch)
    return get_heat(existing["id"])


def update_from_validation(payload: dict[str, Any]) -> dict[str, Any] | None:
    heat_number = (payload.get("heat_number") or "").strip()
    session_id = payload.get("session_id") or ""
    existing = _find_active(heat_number=heat_number, session_id=session_id)
    if not existing and heat_number:
        # Try any record by heat number
        existing = _find_by_heat_number(heat_number)
    if not existing:
        return None

    actual = payload.get("actual_ttt")
    actual_f: float | None = None
    if actual not in (None, "", "Pending"):
        try:
            actual_f = float(actual)
        except (TypeError, ValueError):
            actual_f = None

    predicted = existing.get("predicted_ttt")
    if predicted is None and payload.get("predicted_ttt") is not None:
        predicted = float(payload["predicted_ttt"])

    error = None
    if actual_f is not None and predicted is not None:
        error = round(actual_f - float(predicted), 4)

    patch: dict[str, Any] = {
        "actual_ttt": actual_f,
        "prediction_error": error,
        "operator_comments": payload.get("operator_comments") or existing.get("operator_comments") or "",
        "updated_at": _iso(),
    }
    if payload.get("recommendation_status"):
        patch["recommendation_status"] = payload["recommendation_status"]
    if payload.get("actual_recipe"):
        patch["actual_recipe_json"] = dumps(payload["actual_recipe"])
    if actual_f is not None:
        patch["status"] = _advance_status(existing.get("status"), "Validated")
    elif payload.get("mark_completed"):
        patch["status"] = _advance_status(existing.get("status"), "Completed")
    if payload.get("validated_by"):
        patch["validated_by"] = payload["validated_by"]
    if payload.get("furnace_id"):
        patch["furnace_id"] = payload["furnace_id"]
    if payload.get("supervisor_id"):
        patch["supervisor_id"] = payload["supervisor_id"]
    if payload.get("plant"):
        patch["plant"] = payload["plant"]

    _update(existing["id"], patch)
    return get_heat(existing["id"])


def set_status(heat_id: str, status: str) -> dict[str, Any] | None:
    if status not in STATUS_ORDER:
        raise ValueError(f"Invalid status: {status}")
    existing = get_heat(heat_id)
    if not existing:
        return None
    _update(heat_id, {"status": status, "updated_at": _iso()})
    return get_heat(heat_id)


def archive_heat(heat_id: str) -> dict[str, Any] | None:
    return set_status(heat_id, "Archived")


def get_heat(heat_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM heat_records WHERE id = ?", (heat_id,)).fetchone()
        return row_to_dict(row)
    finally:
        conn.close()


def get_heat_by_number(heat_number: str) -> dict[str, Any] | None:
    row = _find_by_heat_number(heat_number)
    if not row:
        return None
    return get_heat(row["id"])


def list_heats(
    *,
    q: str | None = None,
    shift: str | None = None,
    status: str | None = None,
    operator: str | None = None,
    confidence: str | None = None,
    recommendation: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    period: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 25,
) -> dict[str, Any]:
    date_from, date_to = _resolve_period(period, date_from, date_to)
    where: list[str] = []
    params: list[Any] = []

    if q:
        where.append("(heat_number LIKE ? OR operator_name LIKE ? OR operator_id LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like])
    if shift:
        where.append("shift = ?")
        params.append(shift.upper())
    if status:
        where.append("status = ?")
        params.append(status)
    if operator:
        where.append("(operator_name LIKE ? OR operator_id LIKE ?)")
        params.extend([f"%{operator}%", f"%{operator}%"])
    if confidence:
        where.append("confidence = ?")
        params.append(confidence)
    if recommendation:
        where.append("recommendation_status = ?")
        params.append(recommendation)
    if date_from:
        where.append("date >= ?")
        params.append(date_from)
    if date_to:
        where.append("date <= ?")
        params.append(date_to)

    allowed_sort = {
        "created_at",
        "date",
        "heat_number",
        "shift",
        "status",
        "predicted_ttt",
        "actual_ttt",
        "prediction_error",
        "expected_saving",
        "reliability_index",
        "confidence",
    }
    if sort_by not in allowed_sort:
        sort_by = "created_at"
    direction = "ASC" if sort_dir.lower() == "asc" else "DESC"

    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_connection()
    try:
        total = conn.execute(f"SELECT COUNT(*) FROM heat_records{clause}", params).fetchone()[0]
        page = max(1, page)
        page_size = min(max(1, page_size), 200)
        offset = (page - 1) * page_size
        rows = conn.execute(
            f"SELECT * FROM heat_records{clause} ORDER BY {sort_by} {direction} LIMIT ? OFFSET ?",
            [*params, page_size, offset],
        ).fetchall()
        items = [row_to_dict(r) for r in rows]
        return {
            "items": items,
            "total": total,
            "page": page,
            "page_size": page_size,
            "pages": max(1, math.ceil(total / page_size)) if total else 1,
        }
    finally:
        conn.close()


def shift_dashboard(period: str | None = "today", date_from: str | None = None, date_to: str | None = None) -> dict[str, Any]:
    date_from, date_to = _resolve_period(period, date_from, date_to)
    heats = _fetch_range(date_from, date_to)
    return _compute_dashboard(heats, date_from, date_to)


def plant_analytics(period: str | None = "month", date_from: str | None = None, date_to: str | None = None) -> dict[str, Any]:
    date_from, date_to = _resolve_period(period, date_from, date_to)
    heats = _fetch_range(date_from, date_to)
    if not heats:
        return {
            "period": {"from": date_from, "to": date_to},
            "averages": {},
            "best_recipe": None,
            "worst_recipe": None,
            "most_frequent_recommendation": None,
            "average_prediction_error": None,
            "average_saving": None,
            "validation_metrics": {"count": 0, "mae": None, "rmse": None, "bias": None},
        }

    def avg(key: str) -> float | None:
        vals = [float(h[key]) for h in heats if h.get(key) is not None]
        return round(sum(vals) / len(vals), 3) if vals else None

    validated = [h for h in heats if h.get("actual_ttt") is not None and h.get("predicted_ttt") is not None]
    errors = [float(h["actual_ttt"]) - float(h["predicted_ttt"]) for h in validated]
    mae = round(sum(abs(e) for e in errors) / len(errors), 4) if errors else None
    rmse = round(math.sqrt(sum(e * e for e in errors) / len(errors)), 4) if errors else None
    bias = round(sum(errors) / len(errors), 4) if errors else None

    best = min(
        (h for h in heats if h.get("predicted_ttt") is not None),
        key=lambda h: float(h["predicted_ttt"]),
        default=None,
    )
    worst = max(
        (h for h in heats if h.get("predicted_ttt") is not None),
        key=lambda h: float(h["predicted_ttt"]),
        default=None,
    )

    rec_counts: dict[str, int] = {}
    for h in heats:
        r = h.get("recommendation_status")
        if r:
            rec_counts[r] = rec_counts.get(r, 0) + 1
    most_rec = max(rec_counts, key=rec_counts.get) if rec_counts else None  # type: ignore[arg-type]

    return {
        "period": {"from": date_from, "to": date_to},
        "averages": {
            "HM": avg("hm"),
            "DRI": avg("dri"),
            "LIME": avg("lime"),
            "OXY": avg("oxy"),
            "Electrical_Energy_kWh": avg("electrical_energy_kwh"),
            "charge": avg_charge(heats),
        },
        "best_recipe": row_to_dict_safe(best),
        "worst_recipe": row_to_dict_safe(worst),
        "most_frequent_recommendation": most_rec,
        "average_prediction_error": mae,
        "average_saving": avg("expected_saving"),
        "validation_metrics": {"count": len(validated), "mae": mae, "rmse": rmse, "bias": bias},
    }


def day_report(day: str | None = None) -> dict[str, Any]:
    day = day or _date_str()
    heats = _fetch_range(day, day)
    dash = _compute_dashboard(heats, day, day)
    validated = [h for h in heats if h.get("actual_ttt") is not None]
    best = min(validated, key=lambda h: abs(float(h.get("prediction_error") or 0)), default=None)
    worst = max(validated, key=lambda h: abs(float(h.get("prediction_error") or 0)), default=None)
    rejected = [h for h in heats if h.get("recommendation_status") == "Rejected"]
    pending = [h for h in heats if h.get("status") not in ("Validated", "Archived") and h.get("predicted_ttt") is not None]
    alerts: list[str] = []
    if pending:
        alerts.append(f"{len(pending)} heat(s) pending validation")
    if rejected:
        alerts.append(f"{len(rejected)} rejected recommendation(s)")
    low_conf = [h for h in heats if (h.get("confidence") or "").lower() in ("low", "very low")]
    if low_conf:
        alerts.append(f"{len(low_conf)} low-confidence prediction(s)")

    by_shift: dict[str, int] = {}
    for h in heats:
        s = h.get("shift") or "?"
        by_shift[s] = by_shift.get(s, 0) + 1

    return {
        "type": "daily",
        "date": day,
        "production_summary": dash["cards"],
        "shift_summary": by_shift,
        "best_heat": row_to_dict_safe(best),
        "worst_heat": row_to_dict_safe(worst),
        "average_prediction": dash["cards"].get("average_ttt"),
        "average_error": dash["cards"].get("average_error"),
        "average_saving": dash["cards"].get("average_saving"),
        "rejected_recommendations": [row_to_dict_safe(h) for h in rejected],
        "pending_validation": [row_to_dict_safe(h) for h in pending],
        "plant_alerts": alerts,
        "heats": [row_to_dict_safe(h) for h in heats],
    }


def week_report(anchor: str | None = None) -> dict[str, Any]:
    d = date.fromisoformat(anchor) if anchor else _now().date()
    start = d - timedelta(days=d.weekday())
    end = start + timedelta(days=6)
    heats = _fetch_range(start.isoformat(), end.isoformat())
    dash = _compute_dashboard(heats, start.isoformat(), end.isoformat())
    return {
        "type": "weekly",
        "from": start.isoformat(),
        "to": end.isoformat(),
        "total_heats": len(heats),
        "cards": dash["cards"],
        "shift_comparison": dash["pie"]["shift_distribution"],
        "operator_comparison": _operator_stats(heats),
        "trends": dash["trends"],
        "heats": [row_to_dict_safe(h) for h in heats],
    }


def month_report(anchor: str | None = None) -> dict[str, Any]:
    d = date.fromisoformat(anchor) if anchor else _now().date()
    start = d.replace(day=1)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1) - timedelta(days=1)
    else:
        end = start.replace(month=start.month + 1, day=1) - timedelta(days=1)
    heats = _fetch_range(start.isoformat(), end.isoformat())
    dash = _compute_dashboard(heats, start.isoformat(), end.isoformat())
    analytics = plant_analytics(period=None, date_from=start.isoformat(), date_to=end.isoformat())
    return {
        "type": "monthly",
        "from": start.isoformat(),
        "to": end.isoformat(),
        "cards": dash["cards"],
        "trends": dash["trends"],
        "pie": dash["pie"],
        "plant_analytics": analytics,
        "heats": [row_to_dict_safe(h) for h in heats],
    }


def export_heats(
    *,
    fmt: Literal["csv", "json", "excel", "pdf"] = "csv",
    ids: list[str] | None = None,
    **filters: Any,
) -> tuple[bytes, str, str]:
    if ids:
        heats = [get_heat(i) for i in ids]
        heats = [h for h in heats if h]
    else:
        result = list_heats(**filters, page=1, page_size=10000)
        heats = result["items"]

    if fmt == "json":
        import json

        content = json.dumps({"heats": heats, "count": len(heats)}, indent=2, default=str).encode("utf-8")
        return content, "application/json", "heat_history.json"

    if fmt == "csv":
        return _export_csv(heats), "text/csv", "heat_history.csv"

    if fmt == "excel":
        return _export_excel(heats), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "heat_history.xlsx"

    if fmt == "pdf":
        return _export_pdf(heats), "application/pdf", "heat_history.pdf"

    raise ValueError(f"Unsupported format: {fmt}")


def validation_metrics_from_db() -> dict[str, Any]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT predicted_ttt, actual_ttt FROM heat_records WHERE actual_ttt IS NOT NULL AND predicted_ttt IS NOT NULL"
        ).fetchall()
    finally:
        conn.close()
    errors = [float(r["actual_ttt"]) - float(r["predicted_ttt"]) for r in rows]
    if not errors:
        return {"count": 0, "mae": None, "rmse": None, "bias": None, "mape": None}
    mae = sum(abs(e) for e in errors) / len(errors)
    rmse = math.sqrt(sum(e * e for e in errors) / len(errors))
    bias = sum(errors) / len(errors)
    mape_vals = []
    for r in rows:
        if float(r["actual_ttt"]) != 0:
            mape_vals.append(abs(float(r["actual_ttt"]) - float(r["predicted_ttt"])) / abs(float(r["actual_ttt"])) * 100)
    mape = sum(mape_vals) / len(mape_vals) if mape_vals else None
    return {
        "count": len(errors),
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "bias": round(bias, 4),
        "mape": round(mape, 4) if mape is not None else None,
    }


# ── internals ──────────────────────────────────────────────────────────────


def _f(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _find_active(*, heat_number: str = "", session_id: str = "") -> dict[str, Any] | None:
    conn = get_connection()
    try:
        if session_id:
            row = conn.execute(
                "SELECT * FROM heat_records WHERE session_id = ? AND status != 'Archived' ORDER BY updated_at DESC LIMIT 1",
                (session_id,),
            ).fetchone()
            if row:
                return dict(row)
        if heat_number:
            row = conn.execute(
                "SELECT * FROM heat_records WHERE heat_number = ? AND status != 'Archived' ORDER BY updated_at DESC LIMIT 1",
                (heat_number,),
            ).fetchone()
            if row:
                return dict(row)
        return None
    finally:
        conn.close()


def _find_by_heat_number(heat_number: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM heat_records WHERE heat_number = ? ORDER BY updated_at DESC LIMIT 1",
            (heat_number,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def _insert(fields: dict[str, Any]) -> None:
    cols = list(fields.keys())
    placeholders = ", ".join("?" for _ in cols)
    conn = get_connection()
    try:
        with conn:
            conn.execute(
                f"INSERT INTO heat_records ({', '.join(cols)}) VALUES ({placeholders})",
                [fields[c] for c in cols],
            )
    finally:
        conn.close()


def _update(heat_id: str, fields: dict[str, Any]) -> None:
    fields = {k: v for k, v in fields.items() if k != "id"}
    if not fields:
        return
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_connection()
    try:
        with conn:
            conn.execute(f"UPDATE heat_records SET {sets} WHERE id = ?", [*fields.values(), heat_id])
    finally:
        conn.close()


def _resolve_period(
    period: str | None, date_from: str | None, date_to: str | None
) -> tuple[str | None, str | None]:
    if date_from or date_to:
        return date_from, date_to
    today = _now().date()
    if not period or period == "all":
        return None, None
    if period == "today":
        return today.isoformat(), today.isoformat()
    if period == "yesterday":
        y = today - timedelta(days=1)
        return y.isoformat(), y.isoformat()
    if period == "week" or period == "this_week":
        start = today - timedelta(days=today.weekday())
        return start.isoformat(), today.isoformat()
    if period == "month" or period == "this_month":
        start = today.replace(day=1)
        return start.isoformat(), today.isoformat()
    return date_from, date_to


def _fetch_range(date_from: str | None, date_to: str | None) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if date_from:
        where.append("date >= ?")
        params.append(date_from)
    if date_to:
        where.append("date <= ?")
        params.append(date_to)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_connection()
    try:
        rows = conn.execute(f"SELECT * FROM heat_records{clause} ORDER BY created_at ASC", params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def avg_charge(heats: list[dict[str, Any]]) -> float | None:
    vals = []
    for h in heats:
        parts = [h.get("hm"), h.get("dri"), h.get("hbi"), h.get("bucket")]
        if all(p is not None for p in parts[:2]):  # at least HM/DRI present
            vals.append(sum(float(p or 0) for p in parts))
    return round(sum(vals) / len(vals), 2) if vals else None


def row_to_dict_safe(row: dict[str, Any] | None) -> dict[str, Any] | None:
    if row is None:
        return None
    # Already expanded or raw sqlite dict
    if "recipe_inputs" in row or "HM" in row:
        if "id" in row and "recipe_json" not in row:
            return row
    from app.services.heat_db import row_to_dict as rtd

    # Reconstruct as Row-like via get_heat
    return get_heat(row["id"]) if "id" in row else row


def _compute_dashboard(heats: list[dict[str, Any]], date_from: str | None, date_to: str | None) -> dict[str, Any]:
    total = len(heats)
    completed = sum(1 for h in heats if h.get("status") in ("Completed", "Validated", "Archived"))
    pending = sum(1 for h in heats if h.get("status") not in ("Validated", "Archived") and h.get("predicted_ttt") is not None)
    validated = [h for h in heats if h.get("actual_ttt") is not None and h.get("predicted_ttt") is not None]
    optimized = [h for h in heats if h.get("optimized_ttt") is not None]
    accepted = [h for h in heats if h.get("recommendation_status") == "Accepted"]
    with_rec = [h for h in heats if h.get("recommendation_status")]

    def mean(vals: list[float]) -> float | None:
        return round(sum(vals) / len(vals), 3) if vals else None

    errors = [float(h["actual_ttt"]) - float(h["predicted_ttt"]) for h in validated]
    tt_vals = [float(h["predicted_ttt"]) for h in heats if h.get("predicted_ttt") is not None]
    save_vals = [float(h["expected_saving"]) for h in optimized if h.get("expected_saving") is not None]
    rel_vals = [float(h["reliability_index"]) for h in heats if h.get("reliability_index") is not None]

    conf_dist: dict[str, int] = {}
    for h in heats:
        c = h.get("confidence") or "Unknown"
        conf_dist[c] = conf_dist.get(c, 0) + 1

    shift_dist: dict[str, int] = {}
    for h in heats:
        s = h.get("shift") or "?"
        shift_dist[s] = shift_dist.get(s, 0) + 1

    rec_dist: dict[str, int] = {}
    for h in heats:
        r = h.get("recommendation_status") or "Pending"
        rec_dist[r] = rec_dist.get(r, 0) + 1

    trends = {
        "ttt_vs_heat": [
            {"heat_number": h.get("heat_number"), "predicted_ttt": h.get("predicted_ttt"), "actual_ttt": h.get("actual_ttt")}
            for h in heats
            if h.get("predicted_ttt") is not None
        ],
        "saving_vs_heat": [
            {"heat_number": h.get("heat_number"), "expected_saving": h.get("expected_saving")}
            for h in optimized
        ],
        "error_vs_heat": [
            {
                "heat_number": h.get("heat_number"),
                "prediction_error": (float(h["actual_ttt"]) - float(h["predicted_ttt"])) if h.get("actual_ttt") is not None else None,
            }
            for h in validated
        ],
    }

    return {
        "period": {"from": date_from, "to": date_to},
        "cards": {
            "total_heats": total,
            "completed": completed,
            "pending_validation": pending,
            "average_ttt": mean(tt_vals),
            "average_error": mean([abs(e) for e in errors]),
            "average_saving": mean(save_vals),
            "acceptance_rate": round(100 * len(accepted) / len(with_rec), 1) if with_rec else None,
            "reliability": mean(rel_vals),
            "prediction_confidence": max(conf_dist, key=conf_dist.get) if conf_dist else None,  # type: ignore[arg-type]
            "optimization_success": round(100 * len(optimized) / total, 1) if total else None,
            "validation_rate": round(100 * len(validated) / total, 1) if total else None,
        },
        "pie": {
            "shift_distribution": [{"name": k, "value": v} for k, v in shift_dist.items()],
            "recommendation_acceptance": [{"name": k, "value": v} for k, v in rec_dist.items()],
            "confidence_distribution": [{"name": k, "value": v} for k, v in conf_dist.items()],
        },
        "trends": trends,
    }


def _operator_stats(heats: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_op: dict[str, list[dict[str, Any]]] = {}
    for h in heats:
        op = h.get("operator_name") or h.get("operator_id") or "Unknown"
        by_op.setdefault(op, []).append(h)
    out = []
    for op, rows in by_op.items():
        tt = [float(r["predicted_ttt"]) for r in rows if r.get("predicted_ttt") is not None]
        out.append(
            {
                "operator": op,
                "heats": len(rows),
                "average_ttt": round(sum(tt) / len(tt), 2) if tt else None,
            }
        )
    return out


def _export_csv(heats: list[dict[str, Any]]) -> bytes:
    buf = io.StringIO()
    cols = [
        "id",
        "heat_number",
        "date",
        "time",
        "shift",
        "status",
        "operator_name",
        "predicted_ttt",
        "actual_ttt",
        "prediction_error",
        "expected_saving",
        "reliability_index",
        "confidence",
        "recommendation_status",
        "HM",
        "DRI",
        "LIME",
        "OXY",
        "Electrical_Energy_kWh",
    ]
    writer = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    writer.writeheader()
    for h in heats:
        writer.writerow({c: h.get(c) for c in cols})
    return buf.getvalue().encode("utf-8")


def _export_excel(heats: list[dict[str, Any]]) -> bytes:
    try:
        import openpyxl
        from openpyxl import Workbook
    except ImportError:
        # Fallback: CSV bytes with xlsx extension avoided — return CSV content
        return _export_csv(heats)

    wb = Workbook()
    ws = wb.active
    ws.title = "Heat History"
    cols = [
        "heat_number",
        "date",
        "time",
        "shift",
        "status",
        "operator_name",
        "predicted_ttt",
        "actual_ttt",
        "prediction_error",
        "expected_saving",
        "reliability_index",
        "confidence",
        "recommendation_status",
        "HM",
        "DRI",
        "LIME",
        "OXY",
        "Electrical_Energy_kWh",
    ]
    ws.append(cols)
    for h in heats:
        ws.append([h.get(c) for c in cols])
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _export_pdf(heats: list[dict[str, Any]]) -> bytes:
    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))
    width, height = landscape(A4)
    y = height - 40
    c.setFont("Helvetica-Bold", 14)
    c.drawString(40, y, "JSPL EAF — Heat History Export")
    y -= 24
    c.setFont("Helvetica", 8)
    c.drawString(40, y, f"Records: {len(heats)}  |  Generated: {_iso()}")
    y -= 20
    headers = "Heat | Date | Shift | Status | Pred TTT | Actual | Error | Saving | Conf"
    c.drawString(40, y, headers)
    y -= 14
    for h in heats[:80]:
        line = (
            f"{h.get('heat_number','')} | {h.get('date','')} | {h.get('shift','')} | "
            f"{h.get('status','')} | {h.get('predicted_ttt','')} | {h.get('actual_ttt','')} | "
            f"{h.get('prediction_error','')} | {h.get('expected_saving','')} | {h.get('confidence','')}"
        )
        c.drawString(40, y, line[:140])
        y -= 12
        if y < 40:
            c.showPage()
            y = height - 40
            c.setFont("Helvetica", 8)
    if len(heats) > 80:
        c.drawString(40, y, f"... and {len(heats) - 80} more records")
    c.save()
    return buf.getvalue()
