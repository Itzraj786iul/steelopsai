# Deployment Guide — JSPL EAF TTT Platform

## Architecture

```
Next.js Frontend (port 3000)
        │
        ▼  REST / JSON
FastAPI ML Backend (port 8001)
        │
        ├── production_model.pkl (Phase 19)
        ├── preprocessing_pipeline.pkl
        └── Phase 20.2 optimizer (via phase_21 modules)
```

Streamlit (`research/phase_21_streamlit_app`) is **prototype only** — not used in production.

## Prerequisites

- Python **3.10** (required — model pickles trained with scikit-learn 1.5.2)
- Node.js 18+
- Frozen artifacts in `research/phase_19_model_development/exports/`

> **Render:** Set root directory to `backend`. `runtime.txt` pins Python 3.10.13.

## Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

Verify: `curl http://localhost:8001/health`

## Frontend

```bash
cd steelops-ai/frontend_v2
cp .env.example .env.local   # if exists
```

Add to `.env.local`:

```
NEXT_PUBLIC_EAF_API_URL=http://localhost:8001
```

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Production build

```bash
# Backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 1

# Frontend
npm run build && npm start
```

Use a reverse proxy (nginx) to serve frontend on `/` and proxy `/api/ml/*` to port 8001.

## Performance targets

| Operation | Target |
|-----------|--------|
| API startup | < 5 s |
| POST /predict | < 300 ms (warm) |
| POST /optimize | < 5 s (1000 candidates) |

## Logs

- Backend request logs: stdout
- ML audit logs: `research/phase_21_streamlit_app/logs/`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Model not found | Run from repo root; verify `.pkl` paths in `backend/app/core/config.py` |
| CORS error | Add frontend origin to `CORS_ORIGINS` in config |
| Optimizer slow | First load caches engines; subsequent calls faster |
