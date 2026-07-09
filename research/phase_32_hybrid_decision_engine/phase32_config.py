"""Phase 32 — paths and constants (research only)."""

from __future__ import annotations

from pathlib import Path

PHASE32_ROOT = Path(__file__).resolve().parent
RESEARCH_ROOT = PHASE32_ROOT.parent
PHASE31_ROOT = RESEARCH_ROOT / "phase_31_optimizer_v2"
PHASE30_ROOT = RESEARCH_ROOT / "phase_30_industrial_validation"
PHASE21_ROOT = RESEARCH_ROOT / "phase_21_streamlit_app"
PHASE20_ROOT = RESEARCH_ROOT / "phase_20_recipe_optimizer"
PHASE13_DATASET = RESEARCH_ROOT / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
PLOTS_DIR = PHASE32_ROOT / "plots"

PLANNING_VARS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY"]
BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]
KEY_AGREEMENT_VARS = ["HM", "DRI", "Bucket", "OXY", "CPC"]
OUTCOME_VARS = ["POWER"]

TEST_MAE = 3.061
CI_HALF_WIDTH = 2.9

HYBRID_WEIGHTS = {
    "prediction": 0.25,
    "physics": 0.20,
    "industrial_rules": 0.20,
    "historical_similarity": 0.15,
    "risk": 0.10,
    "operator_preference": 0.10,
}

RELIABILITY_WEIGHTS = {
    "ai_confidence": 0.20,
    "physics_confidence": 0.25,
    "industrial_confidence": 0.20,
    "historical_similarity": 0.15,
    "stability": 0.10,
    "agreement": 0.10,
}

LIVE_HEATS_CSV = """Heat,Shift,HM,DRI,HBI,Bucket,LIME,DOLO,CPC,POWER,OXY
4618213,B,65,38.7,0,28,8.9,1.2,678,36607,3340
4618212,B,60,43.2,0,16,9.6,1.3,806,34294,3082
4618211,B,58,39.7,0,17,10.2,1.7,392,36796,4021
4618210,B,50,46.2,0,17,10.1,1.8,270,39332,3763
4618209,B,55,66.1,0,0,11.3,2.0,377,37974,3900
4618208,B,60,69.1,0,0,12.0,1.9,595,38738,4537
4618207,B,62,54.7,0,13,10.6,2.0,634,35869,4001
4618206,B,60,46.1,0,15,9.4,1.6,625,32918,3831
4618205,B,58,46.6,0,15,8.8,2.0,585,34792,3288
4618204,B,50,25.1,0,15,12.5,2.1,674,34793,4802"""
