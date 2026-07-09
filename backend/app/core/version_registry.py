"""Single source of truth for deployed version metadata."""

from __future__ import annotations

import os
import subprocess
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any


def _git_commit() -> str:
    env = os.getenv("GIT_COMMIT") or os.getenv("RENDER_GIT_COMMIT")
    if env:
        return env[:12]
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return "unknown"


@lru_cache(maxsize=1)
def get_version_registry() -> dict[str, Any]:
    return {
        "frontend_version": "2.8.0",
        "backend_version": "2.8.1",
        "research_phase": "Phase 27",
        "model_phase": "Phase 19",
        "optimizer_phase": "Phase 20.2",
        "dataset_version": "Industrial EAF Heats (Phase 16 normal cohort)",
        "git_commit": _git_commit(),
        "build_date": os.getenv("BUILD_DATE") or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
