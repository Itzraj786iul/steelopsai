"""Phase 31 — paths and constants (research only)."""

from __future__ import annotations

from pathlib import Path

PHASE31_ROOT = Path(__file__).resolve().parent
RESEARCH_ROOT = PHASE31_ROOT.parent
PHASE21_ROOT = RESEARCH_ROOT / "phase_21_streamlit_app"
PHASE20_ROOT = RESEARCH_ROOT / "phase_20_recipe_optimizer"
PHASE13_DATASET = RESEARCH_ROOT / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PHASE30_ROOT = RESEARCH_ROOT / "phase_30_industrial_validation"
PHASE29_LIVE_JSON = RESEARCH_ROOT.parent / "backend" / "_phase_29_1_results.json"

PLOTS_DIR = PHASE31_ROOT / "plots"
EXPORTS_DIR = PHASE31_ROOT / "exports"

# Planning-stage decision variables (optimizer V2)
PLANNING_DECISION_VARS = [
    "HM",
    "DRI",
    "HBI",
    "Bucket",
    "LIME",
    "DOLO",
    "CPC",  # Target Carbon Program (kg setpoint)
    "OXY",  # Target Oxygen Program (Nm³ setpoint)
]

# Outcome variables — fixed at current heat values during planning evaluation
OUTCOME_VARS = ["POWER"]  # EE_KWH

BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]
CONTEXT_VARS = ["Shift", "Power_Restriction", "Transformer_Tap"]

CHARGE_MIN_T = 80.0  # advisory wide band for research (Phase 28 accepts 80–150)
CHARGE_MAX_T = 150.0
VALID_SHIFTS = ["A", "B", "C"]

# Candidate perturbation limits (local search)
ADJUSTMENT = {
    "HM_pct": 0.04,
    "DRI_pct": 0.05,
    "HBI_abs": 2.0,
    "Bucket_abs": 3.0,
    "LIME_pct": 0.12,
    "DOLO_pct": 0.12,
    "CPC_pct": 0.12,
    "OXY_pct": 0.08,
    "charge_tolerance_t": 2.5,
}

DEFAULT_OBJECTIVE_WEIGHTS = {
    "ttt": 1.0,
    "burden_change": 0.35,
    "historical_similarity": 0.40,
    "rule_violations": 0.50,
    "burden_balance": 0.30,
    "stability": 0.20,
}

LITERATURE_REFS = {
    "burden": "Kirschen et al. (2011)",
    "oxygen": "Duan et al. (2014)",
    "carbon": "Morales et al. (2025)",
    "flux": "Memoli et al. (2021)",
    "scrap": "Štore Steel (Energies 2019)",
    "energy": "Knutsen et al. (2020)",
}
