"""SQLite HeatRecord database — production heat history (stdlib sqlite3).

Does not touch ML prediction/optimizer code. Schema lives in backend/data/heat_history/.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "heat_history"
DB_PATH = DATA_DIR / "heats.db"

_lock = threading.Lock()
_schema_ready = False

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS heat_records (
    id TEXT PRIMARY KEY,
    heat_number TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'B',
    status TEXT NOT NULL DEFAULT 'Draft',
    operator_name TEXT DEFAULT '',
    operator_id TEXT DEFAULT '',
    recipe_json TEXT NOT NULL DEFAULT '{}',
    hm REAL,
    dri REAL,
    hbi REAL,
    bucket REAL,
    lime REAL,
    dolo REAL,
    cpc REAL,
    oxy REAL,
    electrical_energy_kwh REAL,
    target_oxygen_program REAL,
    target_carbon_program REAL,
    power_restriction INTEGER DEFAULT 0,
    predicted_ttt REAL,
    prediction_interval_low REAL,
    prediction_interval_high REAL,
    confidence TEXT,
    historical_similarity REAL,
    risk_level TEXT,
    optimized_recipe_json TEXT,
    optimized_ttt REAL,
    expected_saving REAL,
    v2_recipe_json TEXT,
    v2_ttt REAL,
    v2_saving REAL,
    reliability_index REAL,
    physics_confidence REAL,
    industrial_confidence REAL,
    ai_confidence REAL,
    consensus TEXT,
    actual_ttt REAL,
    prediction_error REAL,
    optimizer_result_json TEXT,
    actual_recipe_json TEXT,
    recommendation_status TEXT,
    operator_comments TEXT DEFAULT '',
    explainability_json TEXT,
    session_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_heat_number ON heat_records(heat_number);
CREATE INDEX IF NOT EXISTS idx_date ON heat_records(date);
CREATE INDEX IF NOT EXISTS idx_shift ON heat_records(shift);
CREATE INDEX IF NOT EXISTS idx_status ON heat_records(status);
CREATE INDEX IF NOT EXISTS idx_created ON heat_records(created_at);
CREATE INDEX IF NOT EXISTS idx_session ON heat_records(session_id);
"""

HEAT_ATTR_COLUMNS = {
    "furnace_id": "TEXT",
    "plant": "TEXT",
    "supervisor_id": "TEXT",
    "predicted_by": "TEXT",
    "optimized_by": "TEXT",
    "validated_by": "TEXT",
    "approved_by": "TEXT",
    "queue_status": "TEXT",
}


def ensure_db() -> Path:
    global _schema_ready
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if _schema_ready and DB_PATH.exists():
        return DB_PATH
    with _lock:
        if _schema_ready and DB_PATH.exists():
            return DB_PATH
        conn = sqlite3.connect(str(DB_PATH))
        try:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.executescript(SCHEMA_SQL)
            existing = {r[1] for r in conn.execute("PRAGMA table_info(heat_records)").fetchall()}
            for col, typ in HEAT_ATTR_COLUMNS.items():
                if col not in existing:
                    conn.execute(f"ALTER TABLE heat_records ADD COLUMN {col} {typ}")
            conn.commit()
            _schema_ready = True
        finally:
            conn.close()
    return DB_PATH


def get_connection() -> sqlite3.Connection:
    ensure_db()
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None
    d = dict(row)
    # Expand JSON columns into nested objects for API responses
    for key, out_key in (
        ("recipe_json", "recipe_inputs"),
        ("optimized_recipe_json", "optimized_recipe"),
        ("v2_recipe_json", "v2_recipe"),
        ("optimizer_result_json", "optimizer_result"),
        ("actual_recipe_json", "actual_recipe"),
        ("explainability_json", "explainability"),
    ):
        raw = d.pop(key, None)
        if raw:
            try:
                d[out_key] = json.loads(raw)
            except (TypeError, json.JSONDecodeError):
                d[out_key] = None
        else:
            d[out_key] = None

    # Flatten recipe aliases for API field names
    d["Electrical_Energy_kWh"] = d.pop("electrical_energy_kwh", None)
    d["Target_Oxygen_Program"] = d.pop("target_oxygen_program", None)
    d["Target_Carbon_Program"] = d.pop("target_carbon_program", None)
    d["Power_Restriction"] = d.pop("power_restriction", 0)
    d["HM"] = d.pop("hm", None)
    d["DRI"] = d.pop("dri", None)
    d["HBI"] = d.pop("hbi", None)
    d["Bucket"] = d.pop("bucket", None)
    d["LIME"] = d.pop("lime", None)
    d["DOLO"] = d.pop("dolo", None)
    d["CPC"] = d.pop("cpc", None)
    d["OXY"] = d.pop("oxy", None)
    return d


def dumps(obj: Any) -> str | None:
    if obj is None:
        return None
    return json.dumps(obj, default=str)
