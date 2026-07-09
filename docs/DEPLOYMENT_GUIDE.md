# Deployment Guide

## Prerequisites

- Python 3.11+, Node 20+
- CatBoost, pandas, scikit-learn (backend requirements)
- Research folders `phase_19` through `phase_32` present at repo root

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Verify: `GET http://localhost:8001/health` → version 1.0.0

## Frontend

```bash
cd steelops-ai/frontend_v2
npm install
npm run build
npm run dev
```

Set `NEXT_PUBLIC_EAF_API_URL=http://localhost:8001`

## Phase 33 data directories

- `backend/data/phase_33/validation_results.json`
- `backend/data/phase_33/operator_feedback.json`

## Research deliverables

```bash
python research/phase_33_industrial_product_validation/phase_33_pipeline.py
```

## Readiness checklist

- [ ] Prediction default 120 t ≈ 39.9 min
- [ ] `/hybrid/evaluate` returns reliability 68–78 on live heats
- [ ] `/optimize` unchanged from Phase 20.2
- [ ] `/optimize/v2` never changes POWER
- [ ] Validation page records heats
- [ ] Deployment readiness page loads traffic lights
