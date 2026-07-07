# JSPL EAF Tap-to-Tap Time Decision Support System

Production Streamlit application for **Electric Arc Furnace (EAF) tap-to-tap time (TTT)** prediction and physics-guided recipe optimization at JSPL.

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/streamlit-1.28+-red.svg)](https://streamlit.io/)
[![Model](https://img.shields.io/badge/model-Stacking%20Regressor-green.svg)]()

---

## Overview

This system converts a 22-phase industrial ML pipeline into an operator-facing decision support tool. It predicts heat cycle time from burden and process inputs, explains predictions with feature attribution, and recommends locally optimized recipes that respect EAF metallurgical constraints.

**Frozen artifacts (do not modify):**
- `production_model.pkl` — Phase 19 Stacking Regressor
- `preprocessing_pipeline.pkl` — Phase 19 imputer
- `final_features_25.csv` — 22 production features
- Phase 20.2 optimizer logic

| Metric | Value |
|--------|-------|
| Test MAE | 3.06 min |
| Test R² | 0.366 |
| Features | 22 |
| Optimizer | Phase 20.2 Physics Guided |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Streamlit Application                     │
│  Dashboard │ Prediction │ Optimizer │ What-if │ Reports     │
└────────────┬───────────────────────────────┬────────────────┘
             │                               │
    ┌────────▼────────┐            ┌─────────▼─────────┐
    │ PredictionEngine│            │ OptimizerEngine   │
    │ (Phase 19 model)│            │ (Phase 20.2)      │
    └────────┬────────┘            └─────────┬─────────┘
             │                               │
    ┌────────▼───────────────────────────────▼────────┐
    │           Feature Engineering (Phase 16)         │
    │              22 model features                   │
    └──────────────────────────────────────────────────┘
             │
    ┌────────▼────────────────────────────────────────┐
    │  Historical Data (Phase 13) │ Model Artifacts    │
    └─────────────────────────────────────────────────┘
```

---

## Folder Structure

```
research/
├── phase_19_model_development/exports/   # Frozen model (.pkl)
├── phase_20_recipe_optimizer/          # Frozen optimizer
├── phase_21_streamlit_app/             # This application
│   ├── app.py                          # Main Streamlit UI
│   ├── prediction_engine.py            # Model inference
│   ├── optimizer_engine.py             # Optimizer wrapper
│   ├── feature_engineering.py          # Phase 16 features
│   ├── charts.py                       # Plotly visualizations
│   ├── ui_components.py                # Dashboard, themes, cards
│   ├── utils.py                        # Validation, exports, PDF
│   ├── logging_service.py              # CSV audit logs
│   ├── config.py                       # Paths and constants
│   ├── validate_app.py                 # Automated tests
│   ├── logs/                           # prediction_log.csv, etc.
│   └── assets/logo.png
└── phase_22_final_validation/          # Validation reports
```

---

## Installation

```bash
cd research/phase_21_streamlit_app
pip install -r requirements.txt
```

**Requirements:** Python 3.10+, ~1 GB RAM, access to Phase 13–19 artifact paths.

---

## Usage

```bash
streamlit run app.py
```

Open http://localhost:8501

### Pages

| Page | Purpose |
|------|---------|
| **Dashboard** | KPI overview and quick start |
| **TTT Prediction** | Predict TTT with confidence interval and operator summary |
| **Recipe Optimizer** | Phase 20.2 physics-guided recommendations |
| **What-if Analysis** | Tornado sensitivity chart + live prediction |
| **Historical Comparison** | P5/Median/P95 comparison + distribution plots |
| **Process Health** | Radial gauges vs operating windows |
| **Prediction Report** | Download JSON, CSV, PDF |
| **Session History** | Last 10 predictions |
| **About** | Pipeline timeline and technical details |

---

## Methodology

1. **Data** — Industrial EAF heats cleaned in Phase 13 (`final_model_dataset.csv`).
2. **Features** — 22 engineered features from Phase 16 (ratios, interactions, shift encoding).
3. **Model** — Stacking ensemble tuned with Optuna (Phase 19); frozen for production.
4. **Optimizer** — Local constrained search with physics penalties (Phase 20.2).
5. **Application** — Streamlit DSS with live validation, logging, and exports (Phases 21–22).

---

## Results

- Production model achieves **3.06 min MAE** on held-out test heats.
- Optimizer produces **operationally realistic** local adjustments (HM/DRI coupling, power/oxygen rules).
- Application validates end-to-end via `python validate_app.py`.

---

## Validation

```bash
python validate_app.py
```

Reports are written to `research/phase_22_final_validation/`:
- `validation_report.md`
- `performance_report.md`
- `deployment_checklist.md`
- `application_screenshots.md`

---

## Limitations

- Model R² of 0.37 reflects inherent TTT variability; predictions are decision support, not autonomous control.
- Feature attribution uses fast ablation (not live SHAP on StackingRegressor).
- Optimizer first run (~10 s) generates 1000 local candidates per Phase 20.2 specification.
- PDF chart embedding requires optional `kaleido` package.

---

## Future Work

- Integrate live DCS/Level 2 data feed
- Shift-specific model calibration
- Multi-objective optimization (energy + TTT)
- Docker deployment for plant network

---

## Citation

```
JSPL Internship Project (2025). Electric Arc Furnace Tap-to-Tap Time 
Prediction and Physics-Guided Recipe Optimization. Internal Technical Report.
```

---

## License

Internal use — JSPL. Contact project supervisor for redistribution.
