"""Append-only CSV logging for predictions and optimizer runs."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from config import LOGS_DIR


def _ensure_logs_dir() -> Path:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    return LOGS_DIR


def _append_row(path: Path, row: dict[str, Any]) -> None:
    _ensure_logs_dir()
    df = pd.DataFrame([row])
    if path.exists():
        df.to_csv(path, mode="a", header=False, index=False)
    else:
        df.to_csv(path, index=False)


def log_prediction(
    recipe: dict[str, Any],
    predicted_ttt: float,
    action: str = "predict",
) -> None:
    row = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "action": action,
        "predicted_ttt": round(predicted_ttt, 4),
        "hm": recipe.get("HM"),
        "dri": recipe.get("DRI"),
        "power": recipe.get("POWER"),
        "oxy": recipe.get("OXY"),
        "shift": recipe.get("Shift"),
        "total_charge": sum(float(recipe.get(c, 0)) for c in ["HM", "DRI", "HBI", "Bucket"]),
        "recipe_json": json.dumps({k: recipe[k] for k in recipe if k != "Power_Restriction"}),
    }
    _append_row(LOGS_DIR / "prediction_log.csv", row)


def log_optimizer(
    recipe: dict[str, Any],
    current_ttt: float,
    optimized_ttt: float,
    improvement: float,
    physics_compliant: bool,
    action: str = "optimize",
) -> None:
    row = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "action": action,
        "current_ttt": round(current_ttt, 4),
        "optimized_ttt": round(optimized_ttt, 4),
        "improvement_min": round(improvement, 4),
        "physics_compliant": physics_compliant,
        "power_restriction": recipe.get("Power_Restriction", 0),
        "recipe_json": json.dumps(recipe),
    }
    _append_row(LOGS_DIR / "optimizer_log.csv", row)


def log_user_action(action: str, detail: str = "") -> None:
    row = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "action": action,
        "detail": detail,
    }
    _append_row(LOGS_DIR / "user_actions_log.csv", row)
