"""Enterprise domain services — users, delays, alerts, notifications, dashboards."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from app.services import enterprise_auth as auth
from app.services.enterprise_db import get_conn, row_dict
from app.services.enterprise_rbac import ROLES


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def list_users(q: str | None = None, role: str | None = None, active: bool | None = None) -> list[dict[str, Any]]:
    where: list[str] = []
    params: list[Any] = []
    if q:
        where.append("(email LIKE ? OR full_name LIKE ?)")
        params.extend([f"%{q}%", f"%{q}%"])
    if role:
        where.append("role_code = ?")
        params.append(role)
    if active is not None:
        where.append("is_active = ?")
        params.append(1 if active else 0)
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    conn = get_conn()
    try:
        rows = conn.execute(f"SELECT * FROM users{clause} ORDER BY full_name", params).fetchall()
        return [auth.user_public(dict(r)) for r in rows]
    finally:
        conn.close()


def create_user(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    email = payload["email"].lower().strip()
    if auth.get_user_by_email(email):
        raise ValueError("Email already registered")
    role = payload.get("role") or "operator"
    if role not in {r[0] for r in ROLES}:
        raise ValueError(f"Invalid role: {role}")
    uid = str(uuid.uuid4())
    now = _iso()
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO users
                (id, email, full_name, password_hash, role_code, department_id, shift, is_active,
                 failed_login_count, locked_until, last_login_at, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,1,0,NULL,NULL,?,?)""",
                (
                    uid,
                    email,
                    payload["full_name"],
                    auth.hash_password(payload["password"]),
                    role,
                    payload.get("department_id"),
                    payload.get("shift"),
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="user.create",
        resource="users",
        new_value={"email": email, "role": role},
    )
    return auth.user_public(auth.get_user_by_id(uid))  # type: ignore[arg-type]


def update_user(user_id: str, payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    existing = auth.get_user_by_id(user_id)
    if not existing:
        raise ValueError("User not found")
    fields: dict[str, Any] = {"updated_at": _iso()}
    if "full_name" in payload and payload["full_name"] is not None:
        fields["full_name"] = payload["full_name"]
    if "role" in payload and payload["role"] is not None:
        fields["role_code"] = payload["role"]
    if "department_id" in payload:
        fields["department_id"] = payload["department_id"]
    if "shift" in payload:
        fields["shift"] = payload["shift"]
    if "is_active" in payload and payload["is_active"] is not None:
        fields["is_active"] = 1 if payload["is_active"] else 0
    if payload.get("password"):
        fields["password_hash"] = auth.hash_password(payload["password"])
    sets = ", ".join(f"{k} = ?" for k in fields)
    conn = get_conn()
    try:
        with conn:
            conn.execute(f"UPDATE users SET {sets} WHERE id = ?", [*fields.values(), user_id])
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="user.update",
        resource="users",
        old_value={"email": existing["email"], "role": existing["role_code"]},
        new_value=payload,
    )
    return auth.user_public(auth.get_user_by_id(user_id))  # type: ignore[arg-type]


def reset_password(user_id: str, new_password: str, actor: dict[str, Any]) -> None:
    user = auth.get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                "UPDATE users SET password_hash = ?, failed_login_count = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
                (auth.hash_password(new_password), _iso(), user_id),
            )
    finally:
        conn.close()
    auth.revoke_all_user_tokens(user_id)
    auth.write_audit(user_id=actor["id"], user_email=actor["email"], action="user.reset_password", resource="users", new_value={"user_id": user_id})


def force_logout(user_id: str, actor: dict[str, Any]) -> None:
    auth.revoke_all_user_tokens(user_id)
    auth.write_audit(user_id=actor["id"], user_email=actor["email"], action="user.force_logout", resource="users", new_value={"user_id": user_id})


def list_audit(limit: int = 100, q: str | None = None) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        if q:
            rows = conn.execute(
                "SELECT * FROM audit_logs WHERE action LIKE ? OR user_email LIKE ? OR heat_number LIKE ? ORDER BY created_at DESC LIMIT ?",
                (f"%{q}%", f"%{q}%", f"%{q}%", limit),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def list_login_history(limit: int = 50) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM login_history ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_delay(payload: dict[str, Any], actor: dict[str, Any]) -> dict[str, Any]:
    did = str(uuid.uuid4())
    now = _iso()
    duration = payload.get("duration_min")
    if duration is None and payload.get("start_time") and payload.get("end_time"):
        try:
            start = datetime.fromisoformat(payload["start_time"])
            end = datetime.fromisoformat(payload["end_time"])
            duration = round((end - start).total_seconds() / 60, 1)
        except ValueError:
            duration = None
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO delay_events
                (id, heat_number, category, start_time, end_time, duration_min, department, root_cause,
                 corrective_action, reported_by, shift, status, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    did,
                    payload.get("heat_number"),
                    payload["category"],
                    payload["start_time"],
                    payload.get("end_time"),
                    duration,
                    payload.get("department"),
                    payload.get("root_cause"),
                    payload.get("corrective_action"),
                    actor["email"],
                    payload.get("shift") or actor.get("shift"),
                    payload.get("status") or "Open",
                    now,
                    now,
                ),
            )
    finally:
        conn.close()
    auth.write_audit(
        user_id=actor["id"],
        user_email=actor["email"],
        action="delay.create",
        resource="delays",
        heat_number=payload.get("heat_number") or "",
        new_value=payload,
    )
    create_notification(
        title="Delay entered",
        body=f"{payload['category']} delay recorded for heat {payload.get('heat_number') or '—'}",
        category="alert",
        role_code="production_manager",
    )
    return get_delay(did)  # type: ignore[return-value]


def get_delay(delay_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM delay_events WHERE id = ?", (delay_id,)).fetchone())
    finally:
        conn.close()


def list_delays(limit: int = 100) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute("SELECT * FROM delay_events ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create_alert(
    *,
    severity: str,
    code: str,
    title: str,
    message: str,
    heat_number: str = "",
    shift: str = "",
) -> dict[str, Any]:
    aid = str(uuid.uuid4())
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO alerts (id, severity, code, title, message, heat_number, shift, is_acknowledged, created_at)
                VALUES (?,?,?,?,?,?,?,0,?)""",
                (aid, severity, code, title, message, heat_number, shift, _iso()),
            )
    finally:
        conn.close()
    return {"id": aid, "severity": severity, "code": code, "title": title, "message": message}


def list_alerts(acknowledged: bool | None = None, limit: int = 100) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        if acknowledged is None:
            rows = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE is_acknowledged = ? ORDER BY created_at DESC LIMIT ?",
                (1 if acknowledged else 0, limit),
            ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def acknowledge_alert(alert_id: str, actor: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                "UPDATE alerts SET is_acknowledged = 1, acknowledged_by = ? WHERE id = ?",
                (actor["email"], alert_id),
            )
        return row_dict(conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone())
    finally:
        conn.close()


def create_notification(
    *,
    title: str,
    body: str,
    category: str = "system",
    user_id: str | None = None,
    role_code: str | None = None,
    link: str | None = None,
) -> None:
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO notifications (id, user_id, role_code, title, body, category, is_read, link, created_at)
                VALUES (?,?,?,?,?,?,0,?,?)""",
                (str(uuid.uuid4()), user_id, role_code, title, body, category, link, _iso()),
            )
    finally:
        conn.close()


def list_notifications(user: dict[str, Any], limit: int = 50) -> list[dict[str, Any]]:
    conn = get_conn()
    try:
        rows = conn.execute(
            """SELECT * FROM notifications
               WHERE user_id = ? OR role_code = ? OR (user_id IS NULL AND role_code IS NULL)
               ORDER BY created_at DESC LIMIT ?""",
            (user["id"], user.get("role"), limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def mark_notification_read(notif_id: str, user: dict[str, Any]) -> None:
    conn = get_conn()
    try:
        with conn:
            conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", (notif_id,))
    finally:
        conn.close()


def admin_dashboard() -> dict[str, Any]:
    conn = get_conn()
    try:
        users = conn.execute("SELECT COUNT(*) AS c FROM users WHERE is_active = 1").fetchone()["c"]
        locked = conn.execute("SELECT COUNT(*) AS c FROM users WHERE locked_until IS NOT NULL").fetchone()["c"]
        audits = conn.execute("SELECT COUNT(*) AS c FROM audit_logs").fetchone()["c"]
        fails = conn.execute("SELECT COUNT(*) AS c FROM login_history WHERE success = 0").fetchone()["c"]
        alerts = conn.execute("SELECT COUNT(*) AS c FROM alerts WHERE is_acknowledged = 0").fetchone()["c"]
        sessions = conn.execute("SELECT COUNT(*) AS c FROM refresh_tokens WHERE revoked = 0").fetchone()["c"]
    finally:
        conn.close()

    # Heat DB stats (optional)
    heat_stats = {"prediction_count": 0, "optimization_count": 0}
    try:
        from app.services.heat_db import get_connection as heat_conn

        hc = heat_conn()
        try:
            heat_stats["prediction_count"] = hc.execute(
                "SELECT COUNT(*) AS c FROM heat_records WHERE predicted_ttt IS NOT NULL"
            ).fetchone()["c"]
            heat_stats["optimization_count"] = hc.execute(
                "SELECT COUNT(*) AS c FROM heat_records WHERE optimized_ttt IS NOT NULL"
            ).fetchone()["c"]
        finally:
            hc.close()
    except Exception:
        pass

    from app.core.config import APP_VERSION
    from app.core.version_registry import get_version_registry

    registry = get_version_registry()
    return {
        "system_health": "ok",
        "api_health": "ok",
        "database": "ok",
        "model_versions": registry,
        "app_version": APP_VERSION,
        "active_users": users,
        "locked_accounts": locked,
        "active_sessions": sessions,
        "audit_events": audits,
        "failed_logins": fails,
        "open_alerts": alerts,
        **heat_stats,
    }


def operator_dashboard(user: dict[str, Any]) -> dict[str, Any]:
    shift = user.get("shift")
    try:
        from app.services.heat_history_service import list_heats, shift_dashboard

        dash = shift_dashboard(period="today")
        heats = list_heats(shift=shift, period="today", page_size=10) if shift else list_heats(period="today", page_size=10)
    except Exception:
        dash = {"cards": {}}
        heats = {"items": []}
    return {
        "role": user.get("role"),
        "shift": shift,
        "cards": dash.get("cards", {}),
        "recent_heats": heats.get("items", []),
    }
