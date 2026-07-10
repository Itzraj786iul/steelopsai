"""Enterprise SQLite schema — users, roles, RBAC, audit, delays, notifications.

Does not touch ML artifacts. Lives in backend/data/enterprise/enterprise.db
"""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "enterprise"
DB_PATH = DATA_DIR / "enterprise.db"
_lock = threading.Lock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role_code TEXT NOT NULL,
    department_id TEXT,
    shift TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    last_login_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_history (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT,
    success INTEGER NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    heat_number TEXT,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    role_code TEXT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT DEFAULT 'system',
    is_read INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delay_events (
    id TEXT PRIMARY KEY,
    heat_number TEXT,
    category TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration_min REAL,
    department TEXT,
    root_cause TEXT,
    corrective_action TEXT,
    reported_by TEXT,
    shift TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    severity TEXT NOT NULL,
    code TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    heat_number TEXT,
    shift TEXT,
    is_acknowledged INTEGER NOT NULL DEFAULT 0,
    acknowledged_by TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS operator_assignments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    shift TEXT NOT NULL,
    date TEXT NOT NULL,
    furnace TEXT DEFAULT 'EAF #1',
    assigned_by TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_code);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_delay_heat ON delay_events(heat_number);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(is_acknowledged);
"""

OPS_SCHEMA = """
CREATE TABLE IF NOT EXISTS furnaces (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    plant TEXT DEFAULT 'JSPL',
    type TEXT DEFAULT 'EAF',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    supervisor_id TEXT,
    status TEXT NOT NULL DEFAULT 'Upcoming',
    date TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shift_assignments (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_in_shift TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(shift_id, user_id)
);

CREATE TABLE IF NOT EXISTS heat_queue (
    id TEXT PRIMARY KEY,
    heat_number TEXT NOT NULL,
    furnace_id TEXT,
    shift_id TEXT,
    operator_id TEXT,
    supervisor_id TEXT,
    plant TEXT DEFAULT 'JSPL',
    status TEXT NOT NULL DEFAULT 'Upcoming',
    sort_order INTEGER NOT NULL DEFAULT 0,
    heat_record_id TEXT,
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shift_handovers (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    outgoing_user_id TEXT NOT NULL,
    incoming_user_id TEXT,
    production_summary TEXT DEFAULT '',
    problems TEXT DEFAULT '',
    delay_reasons TEXT DEFAULT '',
    equipment_observations TEXT DEFAULT '',
    pending_heats TEXT DEFAULT '',
    pending_validation TEXT DEFAULT '',
    recommendations TEXT DEFAULT '',
    outgoing_signature TEXT DEFAULT '',
    incoming_signature TEXT DEFAULT '',
    acknowledged_at TEXT,
    status TEXT NOT NULL DEFAULT 'Draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approval_workflows (
    id TEXT PRIMARY KEY,
    heat_number TEXT NOT NULL,
    heat_record_id TEXT,
    stage TEXT NOT NULL DEFAULT 'Operator',
    status TEXT NOT NULL DEFAULT 'Pending',
    operator_id TEXT,
    shift_engineer_id TEXT,
    production_manager_id TEXT,
    operator_at TEXT,
    shift_engineer_at TEXT,
    production_manager_at TEXT,
    approved_at TEXT,
    executed_at TEXT,
    validated_at TEXT,
    comments TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assignee_id TEXT,
    heat_number TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Open',
    due_at TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    category TEXT DEFAULT 'Production',
    audience_role TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT,
    shift_id TEXT,
    furnace_id TEXT,
    notes TEXT DEFAULT '',
    created_by TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shifts_code ON shifts(code);
CREATE INDEX IF NOT EXISTS idx_queue_status ON heat_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_order ON heat_queue(sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_approvals_heat ON approval_workflows(heat_number);
CREATE INDEX IF NOT EXISTS idx_handover_shift ON shift_handovers(shift_id);
"""

MES_SCHEMA = """
CREATE TABLE IF NOT EXISTS production_plans (
    id TEXT PRIMARY KEY,
    production_date TEXT NOT NULL,
    shift_code TEXT NOT NULL,
    furnace_id TEXT NOT NULL DEFAULT 'EAF-1',
    target_grade TEXT DEFAULT '',
    target_heat_count INTEGER NOT NULL DEFAULT 0,
    target_tonnage REAL NOT NULL DEFAULT 0,
    target_ttt REAL,
    target_productivity REAL,
    target_electrical_energy REAL,
    priority TEXT NOT NULL DEFAULT 'Normal',
    status TEXT NOT NULL DEFAULT 'Draft',
    notes TEXT DEFAULT '',
    created_by TEXT,
    approved_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planned_heats (
    id TEXT PRIMARY KEY,
    plan_id TEXT,
    heat_number TEXT NOT NULL UNIQUE,
    target_grade TEXT DEFAULT '',
    target_charge REAL,
    expected_start TEXT,
    expected_end TEXT,
    assigned_operator_id TEXT,
    assigned_shift TEXT,
    assigned_furnace TEXT DEFAULT 'EAF-1',
    priority TEXT NOT NULL DEFAULT 'Normal',
    status TEXT NOT NULL DEFAULT 'Planned',
    recipe_json TEXT,
    heat_record_id TEXT,
    session_id TEXT,
    timeline_json TEXT DEFAULT '{}',
    actual_start TEXT,
    actual_end TEXT,
    notes TEXT DEFAULT '',
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mes_timeline_events (
    id TEXT PRIMARY KEY,
    heat_number TEXT NOT NULL,
    planned_heat_id TEXT,
    event_type TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    duration_min REAL,
    meta_json TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_date ON production_plans(production_date);
CREATE INDEX IF NOT EXISTS idx_plans_status ON production_plans(status);
CREATE INDEX IF NOT EXISTS idx_planned_status ON planned_heats(status);
CREATE INDEX IF NOT EXISTS idx_planned_furnace ON planned_heats(assigned_furnace);
CREATE INDEX IF NOT EXISTS idx_planned_operator ON planned_heats(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_planned_shift ON planned_heats(assigned_shift);
CREATE INDEX IF NOT EXISTS idx_mes_timeline_heat ON mes_timeline_events(heat_number);
"""


def ensure_enterprise_db() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _lock:
        conn = sqlite3.connect(str(DB_PATH))
        try:
            conn.executescript(SCHEMA)
            conn.executescript(OPS_SCHEMA)
            conn.executescript(MES_SCHEMA)
            # Delay status column (enhance existing table)
            cols = {r[1] for r in conn.execute("PRAGMA table_info(delay_events)").fetchall()}
            if "status" not in cols:
                conn.execute("ALTER TABLE delay_events ADD COLUMN status TEXT DEFAULT 'Open'")
            conn.commit()
        finally:
            conn.close()
    return DB_PATH


def get_conn() -> sqlite3.Connection:
    ensure_enterprise_db()
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def row_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def dumps(obj: Any) -> str | None:
    if obj is None:
        return None
    return json.dumps(obj, default=str)
