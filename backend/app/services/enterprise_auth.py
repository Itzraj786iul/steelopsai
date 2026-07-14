"""Enterprise authentication — password hashing, JWT, sessions, lockout.

Uses stdlib PBKDF2 + PyJWT. Does not touch ML services.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.services.enterprise_db import dumps, get_conn, row_dict
from app.services.enterprise_rbac import PERMISSIONS, ROLE_PERMISSIONS, ROLES

# Config (override via env for production)
JWT_SECRET = os.environ.get("EAF_JWT_SECRET", "jspl-eaf-dev-secret-change-in-production")
JWT_ALG = "HS256"
ACCESS_TOKEN_MINUTES = int(os.environ.get("EAF_ACCESS_TOKEN_MIN", "60"))
REFRESH_TOKEN_DAYS = int(os.environ.get("EAF_REFRESH_TOKEN_DAYS", "7"))
MAX_FAILED_LOGINS = 5
LOCKOUT_MINUTES = 15
PBKDF2_ITERATIONS = 120_000


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None = None) -> str:
    return (dt or _now()).isoformat()


def hash_password(password: str, salt: str | None = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2${PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, iters, salt, digest = stored.split("$", 3)
        if algo != "pbkdf2":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iters))
        return hmac.compare_digest(dk.hex(), digest)
    except (ValueError, TypeError):
        return False


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user: dict[str, Any]) -> tuple[str, int]:
    expires = ACCESS_TOKEN_MINUTES * 60
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role_code"],
        "type": "access",
        "exp": _now() + timedelta(seconds=expires),
        "iat": _now(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG), expires


def create_refresh_token(user_id: str) -> str:
    token = secrets.token_urlsafe(48)
    token_id = str(uuid.uuid4())
    expires_at = _now() + timedelta(days=REFRESH_TOKEN_DAYS)
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) VALUES (?,?,?,?,0,?)",
                (token_id, user_id, hash_token(token), _iso(expires_at), _iso()),
            )
    finally:
        conn.close()
    return token


def decode_access_token(token: str) -> dict[str, Any]:
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Not an access token")
    return payload


def seed_enterprise() -> None:
    """Idempotent seed of roles, permissions, and demo users."""
    from app.services.enterprise_db import ensure_enterprise_db

    ensure_enterprise_db()
    conn = get_conn()
    try:
        with conn:
            for code, name, desc in ROLES:
                conn.execute(
                    "INSERT OR IGNORE INTO roles (id, code, name, description) VALUES (?,?,?,?)",
                    (code, code, name, desc),
                )
            for code, name, cat in PERMISSIONS:
                conn.execute(
                    "INSERT OR IGNORE INTO permissions (id, code, name, category) VALUES (?,?,?,?)",
                    (code, code, name, cat),
                )
            for role_code, perms in ROLE_PERMISSIONS.items():
                for p in perms:
                    conn.execute(
                        "INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?,?)",
                        (role_code, p),
                    )
            for dept in ("Production", "Quality", "Maintenance", "IT", "Research"):
                conn.execute(
                    "INSERT OR IGNORE INTO departments (id, name, description) VALUES (?,?,?)",
                    (dept.lower(), dept, f"{dept} department"),
                )

            demo_users = [
                ("admin@jspl.local", "Admin User", "admin", "Admin@123", None, None),
                ("plant.manager@jspl.local", "Plant Manager", "plant_manager", "Plant@123", "production", None),
                ("prod.manager@jspl.local", "Production Manager", "production_manager", "Prod@123", "production", None),
                ("shift.a@jspl.local", "Shift Engineer A", "shift_engineer", "Shift@123", "production", "A"),
                ("operator@jspl.local", "EAF Operator", "operator", "Oper@123", "production", "A"),
                ("quality@jspl.local", "Quality Engineer", "quality_engineer", "Qual@123", "quality", None),
                ("maintenance@jspl.local", "Maintenance Engineer", "maintenance_engineer", "Maint@123", "maintenance", None),
                ("scientist@jspl.local", "Data Scientist", "data_scientist", "Data@123", "research", None),
                ("viewer@jspl.local", "Auditor Viewer", "viewer", "View@123", "it", None),
            ]
            now = _iso()
            for email, name, role, password, dept, shift in demo_users:
                existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
                if existing:
                    continue
                conn.execute(
                    """INSERT INTO users
                    (id, email, full_name, password_hash, role_code, department_id, shift, is_active,
                     failed_login_count, locked_until, last_login_at, created_at, updated_at)
                    VALUES (?,?,?,?,?,?,?,1,0,NULL,NULL,?,?)""",
                    (str(uuid.uuid4()), email, name, hash_password(password), role, dept, shift, now, now),
                )
    finally:
        conn.close()

    from app.services.ops_service import seed_ops

    seed_ops()


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict[str, Any] | None:
    conn = get_conn()
    try:
        return row_dict(conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone())
    finally:
        conn.close()


def get_permissions_for_role(role_code: str) -> list[str]:
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT permission_id FROM role_permissions WHERE role_id = ?", (role_code,)
        ).fetchall()
        if rows:
            return [r["permission_id"] for r in rows]
    finally:
        conn.close()
    return list(ROLE_PERMISSIONS.get(role_code, []))


def user_public(user: dict[str, Any]) -> dict[str, Any]:
    perms = get_permissions_for_role(user["role_code"])
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role_code"],
        "tenant_id": "jspl",
        "is_active": bool(user["is_active"]),
        "department_id": user.get("department_id"),
        "shift": user.get("shift"),
        "permissions": perms,
        "last_login_at": user.get("last_login_at"),
    }


def record_login(email: str, user_id: str | None, success: bool, ip: str = "", ua: str = "") -> None:
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                "INSERT INTO login_history (id, user_id, email, success, ip, user_agent, created_at) VALUES (?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), user_id, email, 1 if success else 0, ip, ua, _iso()),
            )
    finally:
        conn.close()


def write_audit(
    *,
    user_id: str | None,
    user_email: str | None,
    action: str,
    resource: str = "",
    heat_number: str = "",
    old_value: Any = None,
    new_value: Any = None,
    reason: str = "",
    ip: str = "",
    user_agent: str = "",
) -> None:
    conn = get_conn()
    try:
        with conn:
            conn.execute(
                """INSERT INTO audit_logs
                (id, user_id, user_email, action, resource, heat_number, old_value, new_value, reason, ip, user_agent, created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    str(uuid.uuid4()),
                    user_id,
                    user_email,
                    action,
                    resource,
                    heat_number,
                    dumps(old_value),
                    dumps(new_value),
                    reason,
                    ip,
                    user_agent,
                    _iso(),
                ),
            )
    finally:
        conn.close()


def authenticate(email: str, password: str, ip: str = "", ua: str = "") -> dict[str, Any]:
    email_norm = email.lower().strip()
    conn = get_conn()
    try:
        user = row_dict(conn.execute("SELECT * FROM users WHERE email = ?", (email_norm,)).fetchone())
        if not user:
            conn.execute(
                "INSERT INTO login_history (id, user_id, email, success, ip, user_agent, created_at) VALUES (?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), None, email_norm, 0, ip, ua, _iso()),
            )
            conn.commit()
            raise ValueError("Invalid email or password")

        if user.get("locked_until"):
            try:
                locked = datetime.fromisoformat(user["locked_until"])
                if locked.tzinfo is None:
                    locked = locked.replace(tzinfo=timezone.utc)
                if locked > _now():
                    raise ValueError("Account locked due to repeated failed logins. Try again later.")
            except ValueError as exc:
                if "Account locked" in str(exc):
                    raise

        if not user["is_active"]:
            raise ValueError("Account is deactivated")

        if not verify_password(password, user["password_hash"]):
            fails = int(user.get("failed_login_count") or 0) + 1
            locked_until = None
            if fails >= MAX_FAILED_LOGINS:
                locked_until = _iso(_now() + timedelta(minutes=LOCKOUT_MINUTES))
                fails = 0
            conn.execute(
                "UPDATE users SET failed_login_count = ?, locked_until = ?, updated_at = ? WHERE id = ?",
                (fails, locked_until, _iso(), user["id"]),
            )
            conn.execute(
                "INSERT INTO login_history (id, user_id, email, success, ip, user_agent, created_at) VALUES (?,?,?,?,?,?,?)",
                (str(uuid.uuid4()), user["id"], email_norm, 0, ip, ua, _iso()),
            )
            conn.commit()
            raise ValueError("Invalid email or password")

        now = _iso()
        conn.execute(
            "UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?",
            (now, now, user["id"]),
        )
        conn.execute(
            "INSERT INTO login_history (id, user_id, email, success, ip, user_agent, created_at) VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), user["id"], email_norm, 1, ip, ua, now),
        )
        conn.execute(
            """INSERT INTO audit_logs
            (id, user_id, user_email, action, resource, heat_number, old_value, new_value, reason, ip, user_agent, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (str(uuid.uuid4()), user["id"], user["email"], "login", "auth", "", None, None, "", ip, ua, now),
        )
        # Refresh token in same connection
        refresh = secrets.token_urlsafe(48)
        conn.execute(
            "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked, created_at) VALUES (?,?,?,?,0,?)",
            (
                str(uuid.uuid4()),
                user["id"],
                hash_token(refresh),
                _iso(_now() + timedelta(days=REFRESH_TOKEN_DAYS)),
                now,
            ),
        )
        conn.commit()
    finally:
        conn.close()

    access, expires_in = create_access_token(user)
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
        "expires_in": expires_in,
        "user": user_public(user),
    }


def refresh_session(refresh_token: str) -> dict[str, Any]:
    th = hash_token(refresh_token)
    conn = get_conn()
    try:
        row = conn.execute(
            "SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0", (th,)
        ).fetchone()
        if not row:
            raise ValueError("Invalid refresh token")
        expires = datetime.fromisoformat(row["expires_at"])
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires < _now():
            raise ValueError("Refresh token expired")
        user = get_user_by_id(row["user_id"])
        if not user or not user["is_active"]:
            raise ValueError("User inactive")
        access, expires_in = create_access_token(user)
        return {
            "access_token": access,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": expires_in,
            "user": user_public(user),
        }
    finally:
        conn.close()


def revoke_refresh(refresh_token: str) -> None:
    th = hash_token(refresh_token)
    conn = get_conn()
    try:
        with conn:
            conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?", (th,))
    finally:
        conn.close()


def revoke_all_user_tokens(user_id: str) -> None:
    conn = get_conn()
    try:
        with conn:
            conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?", (user_id,))
    finally:
        conn.close()
