"""MES production planning & execution — plans, scheduled heats, KPIs, reports.

Does not modify heat_records schema or ML engines. Links to heats by heat_number.
"""

from __future__ import annotations

import csv
import io
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.services import enterprise_auth as auth
from app.services.enterprise_db import dumps, get_conn, row_dict

# Canonical MES heat status ladder (forward-only)
MES_STATUS_ORDER = [
    "Draft",
    "Planned",
    "PredictionComplete",
    "OptimizationComplete",
    "Approved",
    "Running",
    "Tapped",
    "Validation",
    "Completed",
    "Archived",
    "Delayed",
    "Cancelled",
]

# Live board columns
BOARD_COLUMNS = {
    "Planned": {"Planned", "Draft", "PredictionComplete", "OptimizationComplete", "Approved"},
    "Running": {"Running"},
    "WaitingValidation": {"Tapped", "Validation"},
    "Validated": {"Completed"},  # completed after validation shown separately below
    "Delayed": {"Delayed"},
    "Completed": {"Completed", "Archived"},
}

PLAN_STATUSES = {"Draft", "Approved", "Running", "Completed"}

EVENT_TO_STATUS = {
    "shift_start": None,
    "heat_start": "Running",
    "prediction": "PredictionComplete",
    "optimization": "OptimizationComplete",
    "recommendation_accepted": "Approved",
    "charging": "Running",
    "running": "Running",
    "tap": "Tapped",
    "validation": "Validation",
    "completed": "Completed",
    "archive": "Archived",
    "delayed": "Delayed",
    "cancelled": "Cancelled",
}


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _advance(current: str | None, target: str) -> str:
    if target in ("Delayed", "Cancelled"):
        return target
    if not current or current in ("Delayed",):
        # recover from delayed into target if advancing production
        if current == "Delayed" and target not in ("Cancelled",):
            return target
        return target
    try:
        ci = MES_STATUS_ORDER.index(current)
        ti = MES_STATUS_ORDER.index(target)
        return target if ti >= ci else current
    except ValueError:
        return target


def _parse_recipe(raw: str | None) -> dict[str, Any] | None:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None


def _enrich_planned(row: dict[str, Any]) -> dict[str, Any]:
    row["recipe"] = _parse_recipe(row.pop("recipe_json", None))
    try:
        row["timeline"] = json.loads(row.pop("timeline_json", None) or "{}")
    except (TypeError, json.JSONDecodeError):
        row["timeline"] = {}
    return row


# ── Production plans ───────────────────────────────────────────────────────


def list_plans(
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
    furnace_id: str | None = None,
) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if date_from:
        where.append("production_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("production_date <= ?")
        params.append(date_to)
    if status:
        where.append("status = ?")
        params.append(status)
    if furnace_id:
        where.append("furnace_id = ?")
        params.append(furnace_id)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_conn()
    try:
        rows = conn.execute(
            f"SELECT * FROM production_plans{clause} ORDER BY production_date DESC, created_at DESC LIMIT 200",
            params,
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_plan(plan_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        row = row_dict(conn.execute("SELECT * FROM production_plans WHERE id = ?", (plan_id,)).fetchone())
        if not row:
            return None
        heats = conn.execute(
            "SELECT * FROM planned_heats WHERE plan_id = ? ORDER BY expected_start ASC", (plan_id,)
        ).fetchall()
        row["planned_heats"] = [_enrich_planned(dict(h)) for h in heats]
        return row
    finally:
        conn.close()


def create_plan(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    pid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO production_plans
                (id, production_date, shift_code, furnace_id, target_grade, target_heat_count,
                 target_tonnage, target_ttt, target_productivity, target_electrical_energy,
                 priority, status, notes, created_by, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    pid,
                    payload["production_date"],
                    payload.get("shift_code") or "A",
                    payload.get("furnace_id") or "EAF-1",
                    payload.get("target_grade") or "",
                    int(payload.get("target_heat_count") or 0),
                    float(payload.get("target_tonnage") or 0),
                    payload.get("target_ttt"),
                    payload.get("target_productivity"),
                    payload.get("target_electrical_energy"),
                    payload.get("priority") or "Normal",
                    payload.get("status") or "Draft",
                    payload.get("notes") or "",
                    actor["id"],
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="mes.plan.create",
        resource="production_plans",
        new_value=payload,
    )
    return get_plan(pid)  # type: ignore


def update_plan(plan_id: str, payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any] | None:
    if not get_plan(plan_id):
        return None
    fields: dict[str, Any] = {"updated_at": _iso()}
    for k in (
        "production_date",
        "shift_code",
        "furnace_id",
        "target_grade",
        "target_heat_count",
        "target_tonnage",
        "target_ttt",
        "target_productivity",
        "target_electrical_energy",
        "priority",
        "status",
        "notes",
    ):
        if k in payload and payload[k] is not None:
            fields[k] = payload[k]
    if payload.get("status") == "Approved":
        fields["approved_by"] = actor["id"]
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE production_plans SET {sets} WHERE id = ?", [*fields.values(), plan_id])
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="mes.plan.update",
        resource="production_plans",
        new_value=fields,
    )
    return get_plan(plan_id)


# ── Planned heats (scheduler) ──────────────────────────────────────────────


def list_planned_heats(
    status: str | None = None,
    furnace_id: str | None = None,
    shift: str | None = None,
    operator_id: str | None = None,
    plan_id: str | None = None,
    date: str | None = None,
    q: str | None = None,
) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if status:
        where.append("ph.status = ?")
        params.append(status)
    if furnace_id:
        where.append("ph.assigned_furnace = ?")
        params.append(furnace_id)
    if shift:
        where.append("ph.assigned_shift = ?")
        params.append(shift)
    if operator_id:
        where.append("ph.assigned_operator_id = ?")
        params.append(operator_id)
    if plan_id:
        where.append("ph.plan_id = ?")
        params.append(plan_id)
    if q:
        where.append("(ph.heat_number LIKE ? OR ph.target_grade LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    join = ""
    if date:
        join = " LEFT JOIN production_plans pp ON pp.id = ph.plan_id "
        where.append("(pp.production_date = ? OR date(ph.expected_start) = ?)")
        params.extend([date, date])
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_conn()
    try:
        rows = conn.execute(
            f"SELECT ph.* FROM planned_heats ph{join}{clause} ORDER BY ph.expected_start ASC, ph.created_at DESC LIMIT 300",
            params,
        ).fetchall()
        return [_enrich_planned(dict(r)) for r in rows]
    finally:
        conn.close()


def get_planned_heat(heat_id: str | None = None, heat_number: str | None = None) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        if heat_id:
            row = row_dict(conn.execute("SELECT * FROM planned_heats WHERE id = ?", (heat_id,)).fetchone())
        elif heat_number:
            row = row_dict(
                conn.execute("SELECT * FROM planned_heats WHERE heat_number = ?", (heat_number,)).fetchone()
            )
        else:
            return None
        return _enrich_planned(row) if row else None
    finally:
        conn.close()


def create_planned_heat(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    hid = str(uuid.uuid4())
    now = _iso()
    recipe = payload.get("recipe") or payload.get("recipe_json") or {}
    if isinstance(recipe, str):
        recipe_json = recipe
    else:
        recipe_json = dumps(recipe) or "{}"
    timeline = {"created": now}
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO planned_heats
                (id, plan_id, heat_number, target_grade, target_charge, expected_start, expected_end,
                 assigned_operator_id, assigned_shift, assigned_furnace, priority, status,
                 recipe_json, timeline_json, notes, created_by, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    hid,
                    payload.get("plan_id"),
                    payload["heat_number"].strip(),
                    payload.get("target_grade") or "",
                    payload.get("target_charge"),
                    payload.get("expected_start"),
                    payload.get("expected_end"),
                    payload.get("assigned_operator_id"),
                    payload.get("assigned_shift") or "A",
                    payload.get("assigned_furnace") or "EAF-1",
                    payload.get("priority") or "Normal",
                    payload.get("status") or "Planned",
                    recipe_json,
                    dumps(timeline),
                    payload.get("notes") or "",
                    actor["id"],
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    _record_timeline(payload["heat_number"].strip(), hid, "planned", now)
    # Mirror into heat_queue for ops continuity
    try:
        from app.services import ops_service as ops

        ops.create_queue_item(
            {
                "heat_number": payload["heat_number"].strip(),
                "furnace_id": payload.get("assigned_furnace") or "EAF-1",
                "operator_id": payload.get("assigned_operator_id"),
                "status": "Upcoming",
                "notes": "MES planned heat",
            },
            actor,
        )
    except Exception:
        pass
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="mes.heat.create",
        resource="planned_heats",
        heat_number=payload["heat_number"],
        new_value=payload,
    )
    return get_planned_heat(heat_id=hid)  # type: ignore


def update_planned_heat(heat_id: str, payload: dict[str, Any], actor: dict[str, Any] | None = None) -> dict[str, Any] | None:
    existing = get_planned_heat(heat_id=heat_id)
    if not existing:
        return None
    fields: dict[str, Any] = {"updated_at": _iso()}
    for k in (
        "plan_id",
        "target_grade",
        "target_charge",
        "expected_start",
        "expected_end",
        "assigned_operator_id",
        "assigned_shift",
        "assigned_furnace",
        "priority",
        "notes",
        "heat_record_id",
        "session_id",
        "actual_start",
        "actual_end",
    ):
        if k in payload and payload[k] is not None:
            fields[k] = payload[k]
    if "recipe" in payload and payload["recipe"] is not None:
        fields["recipe_json"] = dumps(payload["recipe"])
    if "status" in payload and payload["status"]:
        fields["status"] = _advance(existing.get("status"), payload["status"])
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE planned_heats SET {sets} WHERE id = ?", [*fields.values(), heat_id])
    finally:
        conn.close()
    if actor:
        auth.write_audit(
            user_id=actor["id"],
            user_email=actor["email"],
            action="mes.heat.update",
            resource="planned_heats",
            heat_number=existing.get("heat_number") or "",
            new_value=fields,
        )
    return get_planned_heat(heat_id=heat_id)


def _record_timeline(
    heat_number: str,
    planned_heat_id: str | None,
    event_type: str,
    occurred_at: str | None = None,
    duration_min: float | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    eid = str(uuid.uuid4())
    now = occurred_at or _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO mes_timeline_events
                (id, heat_number, planned_heat_id, event_type, occurred_at, duration_min, meta_json, created_at)
                VALUES (?,?,?,?,?,?,?,?)""",
                (eid, heat_number, planned_heat_id, event_type, now, duration_min, dumps(meta), _iso()),
            )
            if planned_heat_id:
                row = conn.execute("SELECT timeline_json FROM planned_heats WHERE id = ?", (planned_heat_id,)).fetchone()
                timeline: dict[str, Any] = {}
                if row and row["timeline_json"]:
                    try:
                        timeline = json.loads(row["timeline_json"])
                    except (TypeError, json.JSONDecodeError):
                        timeline = {}
                prev = timeline.get(event_type)
                if prev and isinstance(prev, str):
                    try:
                        t0 = datetime.fromisoformat(prev.replace("Z", "+00:00"))
                        t1 = datetime.fromisoformat(now.replace("Z", "+00:00"))
                        duration_min = round((t1 - t0).total_seconds() / 60, 2)
                    except ValueError:
                        pass
                timeline[event_type] = now
                if duration_min is not None:
                    timeline[f"{event_type}_duration_min"] = duration_min
                conn.execute(
                    "UPDATE planned_heats SET timeline_json = ?, updated_at = ? WHERE id = ?",
                    (dumps(timeline), _iso(), planned_heat_id),
                )
    finally:
        conn.close()


def apply_ai_event(
    heat_number: str,
    event: str,
    *,
    session_id: str | None = None,
    heat_record_id: str | None = None,
    recipe: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Called after prediction/optimize/validate — advances MES status without touching ML."""
    ph = get_planned_heat(heat_number=heat_number)
    if not ph:
        return None
    target = EVENT_TO_STATUS.get(event)
    patch: dict[str, Any] = {}
    if session_id:
        patch["session_id"] = session_id
    if heat_record_id:
        patch["heat_record_id"] = heat_record_id
    if recipe is not None:
        patch["recipe"] = recipe
    if target:
        patch["status"] = target
    if event == "heat_start" and not ph.get("actual_start"):
        patch["actual_start"] = _iso()
    if event in ("validation", "completed", "archive"):
        patch["actual_end"] = _iso()
    updated = update_planned_heat(ph["id"], patch)
    _record_timeline(heat_number, ph["id"], event, _iso())
    return updated


def set_heat_status(heat_id: str, status: str, actor: dict[str, Any]) -> dict[str, Any] | None:
    return update_planned_heat(heat_id, {"status": status}, actor)


# ── Live board / KPI wall ──────────────────────────────────────────────────


def live_board(furnace_id: str | None = None, shift: str | None = None) -> dict[str, Any]:
    heats = list_planned_heats(furnace_id=furnace_id, shift=shift)
    columns: dict[str, list[dict[str, Any]]] = {k: [] for k in (
        "Planned", "Running", "WaitingValidation", "Validated", "Delayed", "Completed"
    )}
    for h in heats:
        st = h.get("status") or "Planned"
        if st == "Delayed":
            columns["Delayed"].append(h)
        elif st == "Running":
            columns["Running"].append(h)
        elif st in ("Tapped", "Validation"):
            columns["WaitingValidation"].append(h)
        elif st in ("Completed",):
            columns["Validated"].append(h)
            columns["Completed"].append(h)
        elif st == "Archived":
            columns["Completed"].append(h)
        elif st in ("Planned", "Draft", "PredictionComplete", "OptimizationComplete", "Approved"):
            columns["Planned"].append(h)
        elif st == "Cancelled":
            continue
        else:
            columns["Planned"].append(h)
    return {
        "refreshed_at": _iso(),
        "columns": columns,
        "counts": {k: len(v) for k, v in columns.items()},
    }


def heat_timeline(heat_number: str) -> dict[str, Any]:
    ph = get_planned_heat(heat_number=heat_number)
    conn = get_conn()
    try:
        events = [
            dict(r)
            for r in conn.execute(
                "SELECT * FROM mes_timeline_events WHERE heat_number = ? ORDER BY occurred_at ASC",
                (heat_number,),
            ).fetchall()
        ]
    finally:
        conn.close()
    # Compute durations between consecutive events
    for i, ev in enumerate(events):
        if i == 0:
            ev["duration_from_prev_min"] = None
            continue
        try:
            t0 = datetime.fromisoformat(events[i - 1]["occurred_at"].replace("Z", "+00:00"))
            t1 = datetime.fromisoformat(ev["occurred_at"].replace("Z", "+00:00"))
            ev["duration_from_prev_min"] = round((t1 - t0).total_seconds() / 60, 2)
        except ValueError:
            ev["duration_from_prev_min"] = None
    return {"heat": ph, "events": events, "stages": MES_STATUS_ORDER}


def kpi_wall(furnace_id: str | None = None) -> dict[str, Any]:
    today = _now_date()
    plans = list_plans(date_from=today, date_to=today, furnace_id=furnace_id)
    heats = list_planned_heats(furnace_id=furnace_id, date=today)
    board = live_board(furnace_id=furnace_id)
    running = board["columns"]["Running"]
    delayed = board["columns"]["Delayed"]
    waiting = board["columns"]["WaitingValidation"]

    # Pull actuals from heat DB (read-only)
    actual_ttt: list[float] = []
    savings: list[float] = []
    pred: float | None = None
    rel: float | None = None
    try:
        from app.services.heat_db import get_connection

        hc = get_connection()
        try:
            rows = hc.execute(
                "SELECT predicted_ttt, actual_ttt, expected_saving, reliability_index FROM heat_records WHERE date = ? LIMIT 100",
                (today,),
            ).fetchall()
            for r in rows:
                if r["actual_ttt"] is not None:
                    actual_ttt.append(float(r["actual_ttt"]))
                elif r["predicted_ttt"] is not None:
                    actual_ttt.append(float(r["predicted_ttt"]))
                if r["expected_saving"] is not None:
                    savings.append(float(r["expected_saving"]))
                if r["reliability_index"] is not None:
                    rel = float(r["reliability_index"])
                if r["predicted_ttt"] is not None:
                    pred = float(r["predicted_ttt"])
        finally:
            hc.close()
    except Exception:
        pass

    current_heat = running[0] if running else (heats[0] if heats else None)
    current_shift = plans[0]["shift_code"] if plans else (current_heat or {}).get("assigned_shift")
    current_furnace = furnace_id or (current_heat or {}).get("assigned_furnace") or "EAF-1"

    def avg(vals: list[float]) -> float | None:
        return round(sum(vals) / len(vals), 3) if vals else None

    return {
        "today_production": len([h for h in heats if h.get("status") in ("Completed", "Archived", "Validation")]),
        "current_shift": current_shift,
        "current_furnace": current_furnace,
        "current_heat": (current_heat or {}).get("heat_number"),
        "average_ttt": avg(actual_ttt),
        "average_saving": avg(savings),
        "current_prediction": pred,
        "current_reliability": rel,
        "running_heats": len(running),
        "delayed_heats": len(delayed),
        "pending_validation": len(waiting),
        "board_counts": board["counts"],
        "refreshed_at": _iso(),
    }


def production_targets(plan_id: str | None = None, date: str | None = None) -> dict[str, Any]:
    if plan_id:
        plan = get_plan(plan_id)
        plans = [plan] if plan else []
    else:
        plans = list_plans(date_from=date or _now_date(), date_to=date or _now_date())
    if not plans:
        return {"plans": [], "summary": None}

    summaries = []
    for plan in plans:
        if not plan:
            continue
        heats = plan.get("planned_heats") or list_planned_heats(plan_id=plan["id"])
        completed = [h for h in heats if h.get("status") in ("Completed", "Archived", "Validation")]
        actual_heats = len(completed)
        target_heats = int(plan.get("target_heat_count") or 0)
        # tonnage approx from charge
        actual_tonnes = sum(float(h.get("target_charge") or 0) for h in completed)
        target_tonnes = float(plan.get("target_tonnage") or 0)

        actual_ttt_vals: list[float] = []
        try:
            from app.services.heat_db import get_connection

            hc = get_connection()
            try:
                for h in completed:
                    row = hc.execute(
                        "SELECT actual_ttt, predicted_ttt FROM heat_records WHERE heat_number = ?",
                        (h["heat_number"],),
                    ).fetchone()
                    if row:
                        v = row["actual_ttt"] if row["actual_ttt"] is not None else row["predicted_ttt"]
                        if v is not None:
                            actual_ttt_vals.append(float(v))
            finally:
                hc.close()
        except Exception:
            pass

        avg_ttt = round(sum(actual_ttt_vals) / len(actual_ttt_vals), 3) if actual_ttt_vals else None
        target_ttt = plan.get("target_ttt")
        target_prod = plan.get("target_productivity")
        actual_prod = round(actual_heats / max(target_heats, 1) * 100, 1) if target_heats else None

        summaries.append(
            {
                "plan_id": plan["id"],
                "production_date": plan["production_date"],
                "shift_code": plan["shift_code"],
                "furnace_id": plan["furnace_id"],
                "target_heats": target_heats,
                "actual_heats": actual_heats,
                "variance_heats": actual_heats - target_heats,
                "target_tonnes": target_tonnes,
                "actual_tonnes": round(actual_tonnes, 2),
                "variance_tonnes": round(actual_tonnes - target_tonnes, 2),
                "target_ttt": target_ttt,
                "actual_ttt": avg_ttt,
                "variance_ttt": round(avg_ttt - float(target_ttt), 3) if avg_ttt is not None and target_ttt else None,
                "target_productivity": target_prod,
                "actual_productivity": actual_prod,
                "variance_productivity": round(actual_prod - float(target_prod), 1)
                if actual_prod is not None and target_prod
                else None,
            }
        )

    return {"plans": summaries, "summary": summaries[0] if len(summaries) == 1 else summaries}


def shift_scorecard(shift_code: str, date: str | None = None) -> dict[str, Any]:
    day = date or _now_date()
    plans = [p for p in list_plans(date_from=day, date_to=day) if p.get("shift_code") == shift_code]
    heats = list_planned_heats(shift=shift_code, date=day)
    completed = [h for h in heats if h.get("status") in ("Completed", "Archived", "Validation")]
    pending = [h for h in heats if h.get("status") not in ("Completed", "Archived", "Cancelled")]
    delayed = [h for h in heats if h.get("status") == "Delayed"]
    target = sum(int(p.get("target_heat_count") or 0) for p in plans)

    # Metrics from heat DB
    tt: list[float] = []
    sav: list[float] = []
    err: list[float] = []
    accepted = 0
    with_rec = 0
    rel: list[float] = []
    validated = 0
    try:
        from app.services.heat_db import get_connection

        hc = get_connection()
        try:
            for h in heats:
                row = hc.execute("SELECT * FROM heat_records WHERE heat_number = ?", (h["heat_number"],)).fetchone()
                if not row:
                    continue
                d = dict(row)
                if d.get("predicted_ttt") is not None:
                    tt.append(float(d["predicted_ttt"]))
                if d.get("expected_saving") is not None:
                    sav.append(float(d["expected_saving"]))
                if d.get("actual_ttt") is not None and d.get("predicted_ttt") is not None:
                    err.append(abs(float(d["actual_ttt"]) - float(d["predicted_ttt"])))
                    validated += 1
                if d.get("recommendation_status"):
                    with_rec += 1
                    if d["recommendation_status"] == "Accepted":
                        accepted += 1
                if d.get("reliability_index") is not None:
                    rel.append(float(d["reliability_index"]))
        finally:
            hc.close()
    except Exception:
        pass

    def avg(vals: list[float]) -> float | None:
        return round(sum(vals) / len(vals), 3) if vals else None

    return {
        "shift": shift_code,
        "date": day,
        "production_target": target,
        "completed": len(completed),
        "pending": len(pending),
        "average_ttt": avg(tt),
        "average_saving": avg(sav),
        "prediction_accuracy": avg(err),
        "recommendation_acceptance": round(100 * accepted / with_rec, 1) if with_rec else None,
        "reliability": avg(rel),
        "validation_pct": round(100 * validated / len(heats), 1) if heats else None,
        "delay_pct": round(100 * len(delayed) / len(heats), 1) if heats else 0.0,
    }


def furnace_utilization(period: str = "daily", furnace_id: str = "EAF-1") -> dict[str, Any]:
    today = datetime.now(timezone.utc).date()
    if period == "weekly":
        start = today - timedelta(days=today.weekday())
        days = 7
    elif period == "monthly":
        start = today.replace(day=1)
        days = (today - start).days + 1
    else:
        start = today
        days = 1
    available_hours = days * 24.0
    heats = list_planned_heats(furnace_id=furnace_id)
    # Filter by date window via expected_start / actual
    running_hours = 0.0
    delay_hours = 0.0
    for h in heats:
        st = h.get("actual_start") or h.get("expected_start")
        en = h.get("actual_end") or h.get("expected_end")
        if not st:
            continue
        try:
            t0 = datetime.fromisoformat(str(st).replace("Z", "+00:00"))
            if t0.date() < start:
                continue
            if en:
                t1 = datetime.fromisoformat(str(en).replace("Z", "+00:00"))
            else:
                t1 = t0 + timedelta(minutes=45)
            hrs = max(0.0, (t1 - t0).total_seconds() / 3600)
            if h.get("status") == "Delayed":
                delay_hours += hrs
            elif h.get("status") not in ("Cancelled", "Planned", "Draft"):
                running_hours += hrs
        except ValueError:
            continue
    idle_hours = max(0.0, available_hours - running_hours - delay_hours)
    util = round(100 * running_hours / available_hours, 1) if available_hours else 0.0
    return {
        "period": period,
        "furnace_id": furnace_id,
        "available_hours": round(available_hours, 2),
        "running_hours": round(running_hours, 2),
        "idle_hours": round(idle_hours, 2),
        "delay_hours": round(delay_hours, 2),
        "utilization_pct": util,
    }


def delay_dashboard() -> dict[str, Any]:
    conn = get_conn()
    try:
        by_cat = [
            dict(r)
            for r in conn.execute(
                "SELECT category, COUNT(*) AS frequency, COALESCE(SUM(duration_min),0) AS total_duration_min "
                "FROM delay_events GROUP BY category ORDER BY frequency DESC"
            ).fetchall()
        ]
        recent = [
            dict(r)
            for r in conn.execute(
                "SELECT id, heat_number, category, start_time, end_time, duration_min, status "
                "FROM delay_events ORDER BY created_at DESC LIMIT 50"
            ).fetchall()
        ]
        # Heatmap: category x hour-of-day (from start_time)
        heatmap: dict[str, dict[str, int]] = {}
        for r in recent:
            cat = r.get("category") or "Unknown"
            hour = "??"
            try:
                hour = str(datetime.fromisoformat(str(r["start_time"]).replace("Z", "+00:00")).hour)
            except Exception:
                pass
            heatmap.setdefault(cat, {})
            heatmap[cat][hour] = heatmap[cat].get(hour, 0) + 1
    finally:
        conn.close()
    delayed_heats = list_planned_heats(status="Delayed")
    return {
        "pareto": by_cat,
        "timeline": recent,
        "heatmap": heatmap,
        "trend": by_cat,
        "frequency": {r["category"]: r["frequency"] for r in by_cat},
        "duration": {r["category"]: r["total_duration_min"] for r in by_cat},
        "delayed_heats": delayed_heats,
    }


def operator_board(operator_id: str) -> dict[str, Any]:
    heats = list_planned_heats(operator_id=operator_id)
    from app.services import ops_service as ops

    tasks = ops.list_tasks(assignee_id=operator_id)
    waiting = [h for h in heats if h.get("status") in ("Tapped", "Validation", "OptimizationComplete", "Approved")]
    return {
        "assigned_heats": heats,
        "pending_validations": [h for h in heats if h.get("status") in ("Tapped", "Validation")],
        "tasks": [t for t in tasks if t.get("status") != "Done"],
        "recommendations": waiting,
        "shift_summary": shift_scorecard(
            (heats[0].get("assigned_shift") if heats else None) or "A"
        ),
    }


def supervisor_board(shift_code: str, date: str | None = None) -> dict[str, Any]:
    day = date or _now_date()
    heats = list_planned_heats(shift=shift_code, date=day)
    from app.services import ops_service as ops

    approvals = ops.list_approvals(status="Pending")
    operators = sorted({h.get("assigned_operator_id") for h in heats if h.get("assigned_operator_id")})
    return {
        "shift": shift_code,
        "date": day,
        "heats": heats,
        "operators": list(operators),
        "running_heats": [h for h in heats if h.get("status") == "Running"],
        "delayed_heats": [h for h in heats if h.get("status") == "Delayed"],
        "approval_queue": approvals,
        "validation_queue": [h for h in heats if h.get("status") in ("Tapped", "Validation")],
        "scorecard": shift_scorecard(shift_code, day),
    }


def plant_manager_board() -> dict[str, Any]:
    today = _now_date()
    week_start = (datetime.now(timezone.utc).date() - timedelta(days=datetime.now(timezone.utc).date().weekday())).isoformat()
    month_start = datetime.now(timezone.utc).date().replace(day=1).isoformat()
    kpi = kpi_wall()
    targets = production_targets(date=today)
    scorecards = {s: shift_scorecard(s, today) for s in ("A", "B", "C")}
    util = {f: furnace_utilization("daily", f) for f in ("EAF-1", "EAF-2", "LF-1")}
    # weekly / monthly throughput from planned heats
    week_heats = list_planned_heats()
    # crude filter
    return {
        "today": kpi,
        "targets": targets,
        "shift_comparison": scorecards,
        "furnace_utilization": util,
        "weekly_trend": {"from": week_start, "heat_count": len(week_heats)},
        "monthly_trend": {"from": month_start},
        "planning_analytics": planning_analytics(date_from=week_start),
    }


def planning_analytics(date_from: str | None = None, date_to: str | None = None) -> dict[str, Any]:
    plans = list_plans(date_from=date_from, date_to=date_to)
    rows = []
    for p in plans:
        t = production_targets(plan_id=p["id"])
        if t.get("summary"):
            s = t["summary"] if isinstance(t["summary"], dict) else t["summary"][0]
            rows.append(s)
    return {"comparisons": rows, "count": len(rows)}


def mes_search(q: str, limit: int = 30) -> dict[str, list[dict[str, Any]]]:
    like = f"%{q}%"
    conn = get_conn()
    result: dict[str, list[dict[str, Any]]] = {}
    try:
        result["plans"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, production_date, shift_code, furnace_id, status, target_grade "
                "FROM production_plans WHERE production_date LIKE ? OR target_grade LIKE ? OR furnace_id LIKE ? LIMIT ?",
                (like, like, like, limit),
            ).fetchall()
        ]
        result["planned_heats"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, heat_number, status, assigned_furnace, assigned_shift, target_grade "
                "FROM planned_heats WHERE heat_number LIKE ? OR target_grade LIKE ? OR assigned_furnace LIKE ? "
                "OR status LIKE ? LIMIT ?",
                (like, like, like, like, limit),
            ).fetchall()
        ]
    finally:
        conn.close()
    # Merge ops search
    try:
        from app.services import ops_service as ops

        base = ops.enterprise_search(q, limit=limit)
        result.update({k: v for k, v in base.items() if k not in result})
    except Exception:
        pass
    return result


def mes_report(kind: str, **filters: Any) -> dict[str, Any]:
    day = filters.get("date") or _now_date()
    shift = filters.get("shift")
    if kind == "shift":
        data = shift_scorecard(shift or "A", day)
    elif kind == "daily":
        data = {"kpi": kpi_wall(), "targets": production_targets(date=day), "board": live_board()}
    elif kind == "weekly":
        start = (datetime.now(timezone.utc).date() - timedelta(days=7)).isoformat()
        data = planning_analytics(date_from=start)
    elif kind == "monthly":
        start = datetime.now(timezone.utc).date().replace(day=1).isoformat()
        data = planning_analytics(date_from=start)
    elif kind == "planning_vs_actual":
        data = planning_analytics(date_from=filters.get("date_from"), date_to=filters.get("date_to"))
    elif kind == "delay":
        data = delay_dashboard()
    elif kind == "operator":
        data = operator_board(filters.get("operator_id") or "")
    elif kind == "supervisor":
        data = supervisor_board(shift or "A", day)
    else:
        data = {"kpi": kpi_wall(), "analytics": planning_analytics()}
    return {"kind": kind, "generated_at": _iso(), "data": data}


def export_mes(kind: str, fmt: str = "json", **filters: Any) -> tuple[bytes, str, str]:
    """Returns (content, media_type, filename)."""
    report = mes_report(kind, **filters)
    if kind == "production_plan":
        rows = list_plans(date_from=filters.get("date_from"), date_to=filters.get("date_to"))
    elif kind == "completed_heats":
        rows = [h for h in list_planned_heats() if h.get("status") in ("Completed", "Archived")]
    else:
        rows = report.get("data") if isinstance(report.get("data"), list) else [report]

    if fmt == "json":
        content = json.dumps(report if kind not in ("production_plan", "completed_heats") else rows, indent=2, default=str).encode()
        return content, "application/json", f"mes_{kind}.json"

    # Flatten for CSV/Excel
    flat: list[dict[str, Any]]
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        flat = rows
    else:
        flat = [{"payload": json.dumps(report, default=str)}]

    if fmt == "csv":
        buf = io.StringIO()
        keys = sorted({k for r in flat for k in r.keys() if k not in ("recipe", "timeline", "planned_heats")})
        w = csv.DictWriter(buf, fieldnames=keys, extrasaction="ignore")
        w.writeheader()
        for r in flat:
            w.writerow({k: r.get(k) for k in keys})
        return buf.getvalue().encode(), "text/csv", f"mes_{kind}.csv"

    if fmt == "excel":
        try:
            from openpyxl import Workbook

            wb = Workbook()
            ws = wb.active
            ws.title = kind[:31]
            keys = sorted({k for r in flat for k in r.keys() if k not in ("recipe", "timeline", "planned_heats")})
            ws.append(keys)
            for r in flat:
                ws.append([r.get(k) for k in keys])
            bio = io.BytesIO()
            wb.save(bio)
            return bio.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", f"mes_{kind}.xlsx"
        except ImportError:
            content = json.dumps(flat, default=str).encode()
            return content, "application/json", f"mes_{kind}.json"

    # PDF — simple text fallback
    text = json.dumps(report, indent=2, default=str)
    return text.encode(), "application/pdf", f"mes_{kind}.pdf"


def dashboard_widgets() -> dict[str, Any]:
    """Database-driven widgets for main dashboard (replaces session-only KPIs)."""
    return {
        "kpi_wall": kpi_wall(),
        "live_board_counts": live_board()["counts"],
        "targets": production_targets(date=_now_date()),
        "furnace_utilization": furnace_utilization("daily"),
        "shift_scorecards": {s: shift_scorecard(s) for s in ("A", "B", "C")},
        "source": "mes+heat_db",
        "refreshed_at": _iso(),
    }
