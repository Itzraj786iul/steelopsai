"""Paths and constants for the Phase 21 Streamlit application."""

from __future__ import annotations

from pathlib import Path

PHASE21_ROOT = Path(__file__).resolve().parent
RESEARCH_ROOT = PHASE21_ROOT.parent

PHASE19_EXPORTS = RESEARCH_ROOT / "phase_19_model_development" / "exports"
PHASE18_EXPORTS = RESEARCH_ROOT / "phase_18_final_feature_selection" / "exports"
PHASE16_DATASET = RESEARCH_ROOT / "phase_16_feature_engineering" / "engineered_normal_ttt_dataset.csv"
PHASE13_DATASET = RESEARCH_ROOT / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PHASE20_ROOT = RESEARCH_ROOT / "phase_20_recipe_optimizer"

MODEL_PATH = PHASE19_EXPORTS / "production_model.pkl"
PREPROC_PATH = PHASE19_EXPORTS / "preprocessing_pipeline.pkl"
FEATURE_LIST_PATH = PHASE18_EXPORTS / "final_features_25.csv"
FEATURE_IMPORTANCE_PATH = PHASE19_EXPORTS / "feature_importance.csv"
RESIDUAL_ANALYSIS_PATH = PHASE19_EXPORTS / "residual_analysis.csv"
MODEL_COMPARISON_PATH = PHASE19_EXPORTS / "model_comparison.csv"

EXPORTS_DIR = PHASE21_ROOT / "exports"
PLOTS_DIR = PHASE21_ROOT / "plots"
ASSETS_DIR = PHASE21_ROOT / "assets"

APP_VERSION = "2.0"
MODEL_NAME = "Stacking Regressor"
OPTIMIZER_VERSION = "Phase 20.2 Physics Guided"
MODEL_PHASE = "Phase 19"
COMPANY_NAME = "JSPL"
DATASET_LABEL = "Industrial EAF Heats"

TEST_MAE_MIN = 3.061
TEST_R2 = 0.366
N_FEATURES = 22

LOGS_DIR = PHASE21_ROOT / "logs"
PHASE22_DIR = RESEARCH_ROOT / "phase_22_final_validation"

CONTROLLABLE_NUMERIC = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]
BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]
OPERATOR_COLS = CONTROLLABLE_NUMERIC + ["Shift"]
VALID_SHIFTS = ["A", "B", "C"]

CHARGE_MIN_T = 115.0
CHARGE_MAX_T = 125.0
Z_95 = 1.96

# Test MAE from frozen Phase 19 production model (display margin).
CI_HALF_WIDTH_95 = 2.9

FEATURE_DISPLAY_NAMES = {
    "HM_X_POWER": "HM x Power",
    "BUCKET_X_CPC": "Bucket x CPC",
    "OXYGEN_PER_TONNE": "Oxygen/Tonne",
    "POWER_PER_TONNE": "Power/Tonne",
    "SOLID_BURDEN_RATIO": "Solid Burden Ratio",
    "HM_TO_DRI_RATIO": "HM/DRI Ratio",
    "BURDEN_SHARE_RANGE": "Burden Share Range",
    "HM_TO_BUCKET_RATIO": "HM/Bucket Ratio",
    "BUCKET_X_DOLO": "Bucket x DOLO",
    "CPC_X_DRI": "CPC x DRI",
    "FLUX_PER_TONNE": "Flux/Tonne",
    "FLUX_TO_CARBON_RATIO": "Flux/Carbon Ratio",
    "DOLO_X_LIME": "DOLO x LIME",
    "DOLO_SQ": "DOLO Squared",
    "CPC_X_HBI": "CPC x HBI",
    "DRI_TO_HBI_RATIO": "DRI/HBI Ratio",
    "BUCKET_X_HBI": "Bucket x HBI",
    "DOLO_X_HBI": "DOLO x HBI",
    "HBI_SQ": "HBI Squared",
    "SHIFT_LABEL": "Shift Label",
    "SHIFT_C": "Shift C",
    "CHARGE_BALANCE_ERROR": "Charge Balance Error",
}

TOP_CONTRIBUTOR_FEATURES = [
    "HM_X_POWER",
    "POWER_PER_TONNE",
    "OXYGEN_PER_TONNE",
    "BUCKET_X_CPC",
    "SOLID_BURDEN_RATIO",
]
