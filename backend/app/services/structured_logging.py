"""Structured industrial logs for prediction and optimization events."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("eaf.industrial")


def _emit(event: str, payload: dict[str, Any]) -> None:
    record = {
        "event": event,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **payload,
    }
    logger.info(json.dumps(record, default=str))


def log_prediction(
    *,
    charge: float,
    shift: str,
    confidence: str,
    warnings: list[str],
    predicted_ttt: float,
    latency_ms: float,
) -> None:
    _emit(
        "prediction",
        {
            "charge_t": round(charge, 2),
            "shift": shift,
            "confidence": confidence,
            "warnings": warnings,
            "predicted_ttt_min": round(predicted_ttt, 3),
            "latency_ms": round(latency_ms, 1),
        },
    )


def log_optimization(*, charge: float, shift: str, improvement_min: float, latency_ms: float) -> None:
    _emit(
        "optimization",
        {
            "charge_t": round(charge, 2),
            "shift": shift,
            "improvement_min": round(improvement_min, 3),
            "latency_ms": round(latency_ms, 1),
        },
    )
