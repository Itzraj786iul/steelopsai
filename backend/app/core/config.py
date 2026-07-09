"""Application configuration and frozen artifact paths."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent
RESEARCH_ROOT = PROJECT_ROOT / "research"
PHASE21_ROOT = RESEARCH_ROOT / "phase_21_streamlit_app"

PHASE19_EXPORTS = RESEARCH_ROOT / "phase_19_model_development" / "exports"
PHASE20_EXPORTS = RESEARCH_ROOT / "phase_20_recipe_optimizer" / "exports"

MODEL_PATH = PHASE19_EXPORTS / "production_model.pkl"
PREPROC_PATH = PHASE19_EXPORTS / "preprocessing_pipeline.pkl"
OPTIMIZER_PKL_PATH = PHASE20_EXPORTS / "recipe_optimizer.pkl"

LOGS_DIR = BACKEND_ROOT / "logs"

APP_NAME = "JSPL EAF TTT API"
APP_VERSION = "2.8.1"
MODEL_NAME = "Stacking Regressor"
OPTIMIZER_VERSION = "Phase 20.2 Physics Guided"
TEST_MAE = 3.061
TEST_R2 = 0.366
N_FEATURES = 22
CI_HALF_WIDTH_95 = 2.9
DATASET_LABEL = "Industrial EAF Heats"

CORS_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://steelopsai.vercel.app",
]

DEFAULT_RECIPE: dict[str, float | str | int] = {
    "HM": 56.8,
    "DRI": 63.2,
    "HBI": 0,
    "Bucket": 0,
    "LIME": 9.9,
    "DOLO": 2.5,
    "CPC": 576,
    "POWER": 29985,
    "OXY": 3911,
    "Shift": "B",
    "Power_Restriction": 0,
}


@lru_cache
def get_settings() -> "Settings":
    return Settings()


class Settings:
  def __init__(self) -> None:
    self.app_name = APP_NAME
    self.app_version = APP_VERSION
    self.logs_dir = LOGS_DIR
    self.phase21_root = PHASE21_ROOT
