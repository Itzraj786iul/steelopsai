"""Production operations service — shifts, furnaces, queue, handover, approvals, tasks.

Does not call or modify ML engines.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.services import enterprise_auth as auth
from app.services.enterprise_db import get_conn, row_dict


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _now_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def seed_ops() -> None:
    """Idempotent seed of furnaces and default shifts."""
    conn = get_conn()
    now = _iso()
    try:
        with conn:
            for code, name, typ in (
                ("EAF-1", "Electric Arc Furnace 1", "EAF"),
                ("EAF-2", "Electric Arc Furnace 2", "EAF"),
                ("LF-1", "Ladle Furnace 1", "LF"),
            ):
                conn.execute(
                    "INSERT OR IGNORE INTO furnaces (id, code, name, plant, type, is_active, created_at) VALUES (?,?,?,?,?,1,?)",
                    (code, code, name, "JSPL", typ, now),
                )
            for code, name, start, end in (
                ("A", "Shift A", "06:00", "14:00"),
                ("B", "Shift B", "14:00", "22:00"),
                ("C", "Shift C", "22:00", "06:00"),
            ):
                existing = conn.execute(
                    "SELECT id FROM shifts WHERE code = ? AND date IS NULL AND is_archived = 0", (code,)
                ).fetchone()
                if not existing:
                    conn.execute(
                        """INSERT INTO shifts
                        (id, code, name, start_time, end_time, supervisor_id, status, date, is_archived, created_at, updated_at)
                        VALUES (?,?,?,?,?,NULL,'Upcoming',NULL,0,?,?)""",
                        (str(uuid.uuid4()), code, name, start, end, now, now),
                    )
    finally:
        conn.close()


# ── Furnaces ──────────────────────────────────────────────────────────────


def list_furnaces(active_only: bool = True) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        if active_only:
            rows = conn.execute("SELECT * FROM furnaces WHERE is_active = 1 ORDER BY code").fetchall()
        else:
            rows = conn.execute("SELECT * FROM furnaces ORDER BY code").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_furnace(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    fid = payload.get("code") or str(uuid.uuid4())
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                "INSERT INTO furnaces (id, code, name, plant, type, is_active, created_at) VALUES (?,?,?,?,?,1,?)",
                (fid, payload["code"], payload["name"], payload.get("plant") or "JSPL", payload.get("type") or "EAF", _iso()),
            )
    finally:
        conn.close()
    auth.write_audit(user_id=actor["id"], user_email=actor["email"], action="furnace.create", resource="furnaces", new_value=payload)
    return row_dict(get_conn().execute("SELECT * FROM furnaces WHERE id = ?", (fid,)).fetchone())  # type: ignore


# ── Shifts ────────────────────────────────────────────────────────────────


def list_shifts(include_archived: bool = False) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        q = "SELECT * FROM shifts"
        if not include_archived:
            q += " WHERE is_archived = 0"
        q += " ORDER BY code, created_at DESC"
        rows = conn.execute(q).fetchall()
        out = []
        for r in rows:
            d = dict(r)
            d["assignments"] = _shift_assignments(d["id"])
            out.append(d)
        return out
    finally:
        conn.close()


def get_shift(shift_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM shifts WHERE id = ?", (shift_id,)).fetchone()
        if not row:
            return None
        d = dict(row)
        d["assignments"] = _shift_assignments(shift_id)
        return d
    finally:
        conn.close()


def _shift_assignments(shift_id: str) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute(
            """SELECT sa.*, u.full_name, u.email, u.role_code
               FROM shift_assignments sa LEFT JOIN users u ON u.id = sa.user_id
               WHERE sa.shift_id = ?""",
            (shift_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_shift(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    sid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO shifts
                (id, code, name, start_time, end_time, supervisor_id, status, date, is_archived, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,0,?,?)""",
                (
                    sid,
                    payload["code"],
                    payload.get("name") or f"Shift {payload['code']}",
                    payload["start_time"],
                    payload["end_time"],
                    payload.get("supervisor_id"),
                    payload.get("status") or "Upcoming",
                    payload.get("date"),
                    now,
                    now,
                ),
            )
            for uid, role in payload.get("assignments") or []:
                conn.execute(
                    "INSERT OR IGNORE INTO shift_assignments (id, shift_id, user_id, role_in_shift, created_at) VALUES (?,?,?,?,?)",
                    (str(uuid.uuid4()), sid, uid, role, now),
                )
    finally:
        conn.close()
    auth.write_audit(user_id=actor["id"], user_email=actor["email"], action="shift.create", resource="shifts", new_value=payload)
    return get_shift(sid)  # type: ignore


def update_shift(shift_id: str, payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any] | None:
    existing = get_shift(shift_id)
    if not existing:
        return None
    fields: dict[str, Any] = {"updated_at": _iso()}
    for k in ("name", "start_time", "end_time", "supervisor_id", "status", "date", "code"):
        if k in payload and payload[k] is not None:
            fields[k] = payload[k]
    if payload.get("is_archived") is not None:
        fields["is_archived"] = 1 if payload["is_archived"] else 0
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE shifts SET {sets} WHERE id = ?", [*fields.values(), shift_id])
            if "assignments" in payload and payload["assignments"] is not None:
                conn.execute("DELETE FROM shift_assignments WHERE shift_id = ?", (shift_id,))
                for item in payload["assignments"]:
                    uid = item["user_id"] if isinstance(item, dict) else item[0]
                    role = item.get("role_in_shift", "operator") if isinstance(item, dict) else item[1]
                    conn.execute(
                        "INSERT INTO shift_assignments (id, shift_id, user_id, role_in_shift, created_at) VALUES (?,?,?,?,?)",
                        (str(uuid.uuid4()), shift_id, uid, role, _iso()),
                    )
    finally:
        conn.close()
    auth.write_audit(user_id=actor["id"], user_email=actor["email"], action="shift.update", resource="shifts", old_value=existing, new_value=payload)
    return get_shift(shift_id)


def assign_user_to_shift(shift_id: str, user_id: str, role_in_shift: str, actor: dict[str, Any]) -> dict[str, Any] | None:
    if not get_shift(shift_id):
        return None
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                "INSERT OR REPLACE INTO shift_assignments (id, shift_id, user_id, role_in_shift, created_at) VALUES (?,?,?,?,?)",
                (str(uuid.uuid4()), shift_id, user_id, role_in_shift, _iso()),
            )
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="shift.assign",
        resource="shifts",
        new_value={"shift_id": shift_id, "user_id": user_id, "role": role_in_shift},
    )
    return get_shift(shift_id)


# ── Heat Queue ────────────────────────────────────────────────────────────


def list_queue(status: str | None = None, furnace_id: str | None = None) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
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
            f"SELECT * FROM heat_queue{clause} ORDER BY sort_order ASC, created_at ASC", params
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_queue_item(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    qid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        max_order = conn.execute("SELECT COALESCE(MAX(sort_order), 0) AS m FROM heat_queue").fetchone()["m"]
        with conn:
            conn.execute(
                """INSERT INTO heat_queue
                (id, heat_number, furnace_id, shift_id, operator_id, supervisor_id, plant, status, sort_order,
                 heat_record_id, notes, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    qid,
                    payload["heat_number"],
                    payload.get("furnace_id") or "EAF-1",
                    payload.get("shift_id"),
                    payload.get("operator_id") or actor["id"],
                    payload.get("supervisor_id"),
                    payload.get("plant") or "JSPL",
                    payload.get("status") or "Upcoming",
                    payload.get("sort_order", max_order + 1),
                    payload.get("heat_record_id"),
                    payload.get("notes") or "",
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    return get_queue_item(qid)  # type: ignore


def get_queue_item(qid: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM heat_queue WHERE id = ?", (qid,)).fetchone())
    finally:
        conn.close()


def update_queue_item(qid: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not get_queue_item(qid):
        return None
    fields: dict[str, Any] = {"updated_at": _iso()}
    for k in ("status", "furnace_id", "shift_id", "operator_id", "supervisor_id", "notes", "sort_order", "heat_number"):
        if k in payload and payload[k] is not None:
            fields[k] = payload[k]
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE heat_queue SET {sets} WHERE id = ?", [*fields.values(), qid])
    finally:
        conn.close()
    return get_queue_item(qid)


def reorder_queue(ordered_ids: list[str], actor: dict[str, Any]) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        with conn:
            for i, qid in enumerate(ordered_ids):
                conn.execute("UPDATE heat_queue SET sort_order = ?, updated_at = ? WHERE id = ?", (i + 1, _iso(), qid))
    finally:
        conn.close()
    auth.write_audit(user_id=actor["id"], user_email=actor["email"], action="queue.reorder", resource="heat_queue", new_value=ordered_ids)
    return list_queue()


# ── Shift Handover ────────────────────────────────────────────────────────


def create_handover(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    hid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO shift_handovers
                (id, shift_id, outgoing_user_id, incoming_user_id, production_summary, problems, delay_reasons,
                 equipment_observations, pending_heats, pending_validation, recommendations,
                 outgoing_signature, incoming_signature, acknowledged_at, status, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,'Submitted',?,?)""",
                (
                    hid,
                    payload["shift_id"],
                    actor["id"],
                    payload.get("incoming_user_id"),
                    payload.get("production_summary") or "",
                    payload.get("problems") or "",
                    payload.get("delay_reasons") or "",
                    payload.get("equipment_observations") or "",
                    payload.get("pending_heats") or "",
                    payload.get("pending_validation") or "",
                    payload.get("recommendations") or "",
                    payload.get("outgoing_signature") or actor.get("full_name") or actor["email"],
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    return get_handover(hid)  # type: ignore


def get_handover(hid: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM shift_handovers WHERE id = ?", (hid,)).fetchone())
    finally:
        conn.close()


def list_handovers(limit: int = 50) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM shift_handovers ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def acknowledge_handover(hid: str, signature: str, actor: dict[str, Any]) -> dict[str, Any] | None:
    if not get_handover(hid):
        return None
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """UPDATE shift_handovers SET incoming_user_id = ?, incoming_signature = ?,
                acknowledged_at = ?, status = 'Acknowledged', updated_at = ? WHERE id = ?""",
                (actor["id"], signature or actor.get("full_name") or actor["email"], _iso(), _iso(), hid),
            )
    finally:
        conn.close()
    return get_handover(hid)


# ── Approval workflow ─────────────────────────────────────────────────────

APPROVAL_STAGES = ["Operator", "ShiftEngineer", "ProductionManager", "Approved", "Executed", "Validated"]


def start_approval(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    aid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO approval_workflows
                (id, heat_number, heat_record_id, stage, status, operator_id, operator_at, comments, created_at, updated_at)
                VALUES (?,?,?,'Operator','Pending',?,?,?,?,?)""",
                (
                    aid,
                    payload["heat_number"],
                    payload.get("heat_record_id"),
                    actor["id"],
                    now,
                    payload.get("comments") or "",
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    return get_approval(aid)  # type: ignore


def get_approval(aid: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM approval_workflows WHERE id = ?", (aid,)).fetchone())
    finally:
        conn.close()


def list_approvals(status: str | None = None) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        if status:
            rows = conn.execute(
                "SELECT * FROM approval_workflows WHERE status = ? ORDER BY created_at DESC", (status,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM approval_workflows ORDER BY created_at DESC LIMIT 100").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def advance_approval(aid: str, action: str, actor: dict[str, Any], comments: str = "") -> dict[str, Any] | None:
    """action: submit | approve_shift | approve_pm | execute | validate | reject"""
    row = get_approval(aid)
    if not row:
        return None
    now = _iso()
    patch: dict[str, Any] = {"updated_at": now, "comments": comments or row.get("comments") or ""}
    role = actor.get("role")

    if action == "submit":
        patch.update({"stage": "ShiftEngineer", "status": "Pending", "operator_id": actor["id"], "operator_at": now})
    elif action == "approve_shift":
        patch.update(
            {"stage": "ProductionManager", "status": "Pending", "shift_engineer_id": actor["id"], "shift_engineer_at": now}
        )
    elif action == "approve_pm":
        patch.update(
            {
                "stage": "Approved",
                "status": "Approved",
                "production_manager_id": actor["id"],
                "production_manager_at": now,
                "approved_at": now,
            }
        )
    elif action == "execute":
        patch.update({"stage": "Executed", "status": "Executed", "executed_at": now})
    elif action == "validate":
        patch.update({"stage": "Validated", "status": "Validated", "validated_at": now})
    elif action == "reject":
        patch.update({"status": "Rejected", "stage": row.get("stage") or "Operator"})
    else:
        raise ValueError(f"Unknown action: {action}")

    sets = ", ".join(f"{k} = ?" for k in patch)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE approval_workflows SET {sets} WHERE id = ?", [*patch.values(), aid])
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action=f"approval.{action}",
        resource="approvals",
        heat_number=row.get("heat_number") or "",
        new_value={"role": role, **patch},
    )
    return get_approval(aid)


# ── Tasks ─────────────────────────────────────────────────────────────────


def list_tasks(assignee_id: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if assignee_id:
        where.append("assignee_id = ?")
        params.append(assignee_id)
    if status:
        where.append("status = ?")
        params.append(status)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_conn()
    try:
        rows = conn.execute(f"SELECT * FROM tasks{clause} ORDER BY created_at DESC LIMIT 200", params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_task(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    tid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO tasks
                (id, title, description, assignee_id, heat_number, priority, status, due_at, created_by, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    tid,
                    payload["title"],
                    payload.get("description") or "",
                    payload.get("assignee_id"),
                    payload.get("heat_number"),
                    payload.get("priority") or "Medium",
                    payload.get("status") or "Open",
                    payload.get("due_at"),
                    actor["id"],
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    return get_task(tid)  # type: ignore


def get_task(tid: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM tasks WHERE id = ?", (tid,)).fetchone())
    finally:
        conn.close()


def update_task(tid: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not get_task(tid):
        return None
    fields: dict[str, Any] = {"updated_at": _iso()}
    for k in ("title", "description", "assignee_id", "priority", "status", "due_at", "heat_number"):
        if k in payload and payload[k] is not None:
            fields[k] = payload[k]
    if payload.get("status") == "Done":
        fields["completed_at"] = _iso()
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE tasks SET {sets} WHERE id = ?", [*fields.values(), tid])
    finally:
        conn.close()
    return get_task(tid)


# ── Announcements ─────────────────────────────────────────────────────────


def list_announcements(role: str | None = None) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 50"
        ).fetchall()
        items = [dict(r) for r in rows]
        if role and role != "admin":
            items = [a for a in items if not a.get("audience_role") or a["audience_role"] == role]
        return items
    finally:
        conn.close()


def create_announcement(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    aid = str(uuid.uuid4())
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO announcements
                (id, title, body, category, audience_role, is_active, created_by, created_at, expires_at)
                VALUES (?,?,?,?,?,1,?,?,?)""",
                (
                    aid,
                    payload["title"],
                    payload["body"],
                    payload.get("category") or "Production",
                    payload.get("audience_role"),
                    actor["id"],
                    _iso(),
                    payload.get("expires_at"),
                ),
            )
    finally:
        conn.close()
    return row_dict(get_conn().execute("SELECT * FROM announcements WHERE id = ?", (aid,)).fetchone())  # type: ignore


# ── Calendar ──────────────────────────────────────────────────────────────


def list_calendar(date_from: str | None = None, date_to: str | None = None) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if date_from:
        where.append("start_at >= ?")
        params.append(date_from)
    if date_to:
        where.append("start_at <= ?")
        params.append(date_to + "T23:59:59" if len(date_to) == 10 else date_to)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_conn()
    try:
        rows = conn.execute(f"SELECT * FROM calendar_events{clause} ORDER BY start_at ASC", params).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_calendar_event(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    eid = str(uuid.uuid4())
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO calendar_events
                (id, title, event_type, start_at, end_at, shift_id, furnace_id, notes, created_by, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    eid,
                    payload["title"],
                    payload.get("event_type") or "Production",
                    payload["start_at"],
                    payload.get("end_at"),
                    payload.get("shift_id"),
                    payload.get("furnace_id"),
                    payload.get("notes") or "",
                    actor["id"],
                    _iso(),
                ),
            )
    finally:
        conn.close()
    return row_dict(get_conn().execute("SELECT * FROM calendar_events WHERE id = ?", (eid,)).fetchone())  # type: ignore


# ── Enterprise search ─────────────────────────────────────────────────────


def enterprise_search(q: str, limit: int = 20) -> dict[str, list[dict[str, Any]]]:
    like = f"%{q}%"
    conn = get_conn()
    result: dict[str, list[dict[str, Any]]] = {}
    try:
        result["users"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, email, full_name, role_code, shift FROM users WHERE email LIKE ? OR full_name LIKE ? LIMIT ?",
                (like, like, limit),
            ).fetchall()
        ]
        result["shifts"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, code, name, status, start_time, end_time FROM shifts WHERE code LIKE ? OR name LIKE ? LIMIT ?",
                (like, like, limit),
            ).fetchall()
        ]
        result["delays"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, heat_number, category, status, start_time FROM delay_events WHERE heat_number LIKE ? OR category LIKE ? LIMIT ?",
                (like, like, limit),
            ).fetchall()
        ]
        result["tasks"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, title, status, priority, heat_number FROM tasks WHERE title LIKE ? OR heat_number LIKE ? LIMIT ?",
                (like, like, limit),
            ).fetchall()
        ]
        result["queue"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, heat_number, status, furnace_id FROM heat_queue WHERE heat_number LIKE ? LIMIT ?",
                (like, limit),
            ).fetchall()
        ]
        result["announcements"] = [
            dict(r)
            for r in conn.execute(
                "SELECT id, title, category FROM announcements WHERE title LIKE ? OR body LIKE ? LIMIT ?",
                (like, like, limit),
            ).fetchall()
        ]
    finally:
        conn.close()

    # Heats from heat DB
    try:
        from app.services.heat_db import get_connection

        hc = get_connection()
        try:
            rows = hc.execute(
                "SELECT id, heat_number, shift, status, predicted_ttt, date FROM heat_records WHERE heat_number LIKE ? LIMIT ?",
                (like, limit),
            ).fetchall()
            result["heats"] = [dict(r) for r in rows]
        finally:
            hc.close()
    except Exception:
        result["heats"] = []

    return result


# ── Performance dashboards ────────────────────────────────────────────────


def operator_performance(user_id: str) -> dict[str, Any]:
    tasks = list_tasks(assignee_id=user_id)
    open_tasks = [t for t in tasks if t.get("status") != "Done"]
    heats: list[dict[str, Any]] = []
    try:
        from app.services.heat_db import get_connection

        hc = get_connection()
        try:
            rows = hc.execute(
                "SELECT * FROM heat_records WHERE operator_id = ? OR predicted_by = ? ORDER BY created_at DESC LIMIT 50",
                (user_id, user_id),
            ).fetchall()
            heats = [dict(r) for r in rows]
        finally:
            hc.close()
    except Exception:
        pass

    today = _now_date()
    today_heats = [h for h in heats if (h.get("date") or "") == today]
    validated = [h for h in heats if h.get("actual_ttt") is not None]
    accepted = [h for h in heats if h.get("recommendation_status") == "Accepted"]
    with_rec = [h for h in heats if h.get("recommendation_status")]
    errors = [
        abs(float(h["actual_ttt"]) - float(h["predicted_ttt"]))
        for h in validated
        if h.get("predicted_ttt") is not None
    ]
    savings = [float(h["expected_saving"]) for h in heats if h.get("expected_saving") is not None]
    tt = [float(h["predicted_ttt"]) for h in heats if h.get("predicted_ttt") is not None]

    def avg(vals: list[float]) -> float | None:
        return round(sum(vals) / len(vals), 3) if vals else None

    return {
        "today_heats": len(today_heats),
        "validated_heats": len(validated),
        "acceptance_rate": round(100 * len(accepted) / len(with_rec), 1) if with_rec else None,
        "average_prediction_error": avg(errors),
        "average_saving": avg(savings),
        "average_ttt": avg(tt),
        "pending_tasks": open_tasks,
        "recent_heats": heats[:10],
    }


def production_manager_dashboard() -> dict[str, Any]:
    queue = list_queue()
    approvals = list_approvals(status="Pending")
    delays = []
    conn = get_conn()
    try:
        delays = [dict(r) for r in conn.execute("SELECT * FROM delay_events WHERE COALESCE(status,'Open') != 'Closed' ORDER BY created_at DESC LIMIT 20").fetchall()]
        shifts = [dict(r) for r in conn.execute("SELECT * FROM shifts WHERE is_archived = 0").fetchall()]
    finally:
        conn.close()

    by_status: dict[str, int] = {}
    for q in queue:
        s = q.get("status") or "?"
        by_status[s] = by_status.get(s, 0) + 1

    return {
        "live_queue": by_status,
        "running_heats": [q for q in queue if q.get("status") == "Running"],
        "upcoming_heats": [q for q in queue if q.get("status") == "Upcoming"],
        "approval_backlog": approvals,
        "validation_backlog": [q for q in queue if q.get("status") == "WaitingValidation"],
        "open_delays": delays,
        "shifts": shifts,
        "queue": queue,
    }


def generate_ops_alerts() -> list[dict[str, Any]]:
    """Create plant alerts from queue/approvals/delays state."""
    created = []
    pending = list_approvals(status="Pending")
    if len(pending) >= 3:
        from app.services import enterprise_service as esvc

        a = esvc.create_alert(
            severity="warning",
            code="PENDING_APPROVALS",
            title="Pending approvals",
            message=f"{len(pending)} recommendation approvals awaiting action",
        )
        created.append(a)
    delayed = [q for q in list_queue() if q.get("status") == "Delayed"]
    if delayed:
        from app.services import enterprise_service as esvc

        a = esvc.create_alert(
            severity="critical",
            code="HEAT_DELAYED",
            title="Heat delayed",
            message=f"{len(delayed)} heat(s) marked delayed in production queue",
            heat_number=delayed[0].get("heat_number") or "",
        )
        created.append(a)
    return created


def shift_performance(shift_code: str | None = None) -> dict[str, Any]:
    """Aggregate KPIs for a shift code (A/B/C) or all active shifts."""
    queue = list_queue()
    delays = []
    conn = get_conn()
    try:
        delays = [dict(r) for r in conn.execute("SELECT * FROM delay_events ORDER BY created_at DESC LIMIT 200").fetchall()]
    finally:
        conn.close()

    heats: list[dict[str, Any]] = []
    try:
        from app.services.heat_db import get_connection

        hc = get_connection()
        try:
            if shift_code:
                rows = hc.execute(
                    "SELECT * FROM heat_records WHERE UPPER(shift) = ? ORDER BY created_at DESC LIMIT 100",
                    (shift_code.upper()[:1],),
                ).fetchall()
            else:
                rows = hc.execute("SELECT * FROM heat_records ORDER BY created_at DESC LIMIT 100").fetchall()
            heats = [dict(r) for r in rows]
        finally:
            hc.close()
    except Exception:
        pass

    validated = [h for h in heats if h.get("actual_ttt") is not None]
    accepted = [h for h in heats if h.get("recommendation_status") == "Accepted"]
    with_rec = [h for h in heats if h.get("recommendation_status")]
    completed = [h for h in heats if (h.get("status") or "") in ("Completed", "Validated", "Archived")]
    errors = [
        abs(float(h["actual_ttt"]) - float(h["predicted_ttt"]))
        for h in validated
        if h.get("predicted_ttt") is not None
    ]
    savings = [float(h["expected_saving"]) for h in heats if h.get("expected_saving") is not None]
    tt = [float(h["predicted_ttt"]) for h in heats if h.get("predicted_ttt") is not None]
    rel = [float(h["reliability_index"]) for h in heats if h.get("reliability_index") is not None]
    delayed_q = [q for q in queue if q.get("status") == "Delayed"]

    def avg(vals: list[float]) -> float | None:
        return round(sum(vals) / len(vals), 3) if vals else None

    return {
        "shift": shift_code or "ALL",
        "average_ttt": avg(tt),
        "average_saving": avg(savings),
        "average_reliability": avg(rel),
        "acceptance_rate": round(100 * len(accepted) / len(with_rec), 1) if with_rec else None,
        "average_prediction_error": avg(errors),
        "completed_heats": len(completed),
        "delay_pct": round(100 * len(delayed_q) / len(queue), 1) if queue else 0.0,
        "validation_pct": round(100 * len(validated) / len(heats), 1) if heats else None,
        "open_delays": len([d for d in delays if (d.get("status") or "Open") != "Closed"]),
    }


def ops_analytics() -> dict[str, Any]:
    """Dashboard analytics: throughput, delay/validation/approval trends, utilization."""
    queue = list_queue()
    approvals = list_approvals()
    shifts = list_shifts()
    tasks = list_tasks()
    by_status: dict[str, int] = {}
    for q in queue:
        s = q.get("status") or "?"
        by_status[s] = by_status.get(s, 0) + 1

    conn = get_conn()
    try:
        delay_rows = [dict(r) for r in conn.execute(
            "SELECT category, COUNT(*) AS n FROM delay_events GROUP BY category"
        ).fetchall()]
    finally:
        conn.close()

    heat_count = 0
    try:
        from app.services.heat_db import get_connection

        hc = get_connection()
        try:
            heat_count = hc.execute("SELECT COUNT(*) FROM heat_records").fetchone()[0]
        finally:
            hc.close()
    except Exception:
        pass

    running_shifts = [s for s in shifts if s.get("status") == "Running"]
    open_tasks = [t for t in tasks if t.get("status") != "Done"]

    return {
        "heat_throughput": heat_count,
        "queue_by_status": by_status,
        "delay_trend": delay_rows,
        "validation_trend": {
            "validated": by_status.get("Validated", 0),
            "waiting": by_status.get("WaitingValidation", 0),
        },
        "approval_trend": {
            "pending": len([a for a in approvals if a.get("status") == "Pending"]),
            "approved": len([a for a in approvals if a.get("status") == "Approved"]),
            "executed": len([a for a in approvals if a.get("status") == "Executed"]),
            "validated": len([a for a in approvals if a.get("status") == "Validated"]),
        },
        "shift_utilization": {
            "total": len(shifts),
            "running": len(running_shifts),
            "upcoming": len([s for s in shifts if s.get("status") == "Upcoming"]),
        },
        "operator_utilization": {
            "open_tasks": len(open_tasks),
            "total_tasks": len(tasks),
        },
    }


def ops_report(kind: str = "daily") -> dict[str, Any]:
    """Lightweight ops report envelope (daily/weekly/monthly/shift/operator/furnace)."""
    pm = production_manager_dashboard()
    analytics = ops_analytics()
    return {
        "kind": kind,
        "generated_at": _iso(),
        "production": pm,
        "analytics": analytics,
        "shift_performance": shift_performance(),
    }
