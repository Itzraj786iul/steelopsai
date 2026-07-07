# JSPL EAF Tap-to-Tap Time — Industrial AI Platform

Production integration of the frozen ML pipeline (Phases 1–20.2) into a FastAPI + Next.js decision support platform.

## Quick start

```bash
# Terminal 1 — ML API
cd backend && pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload

# Terminal 2 — Web UI
cd steelops-ai/frontend_v2
echo NEXT_PUBLIC_EAF_API_URL=http://localhost:8001 > .env.local
npm install && npm run dev
```

- **Landing:** http://localhost:3000
- **API docs:** http://localhost:8001/docs
- **Streamlit prototype:** `research/phase_21_streamlit_app` (not production)

## Structure

```
Data 2/
├── backend/                    # FastAPI REST API (production)
├── frontend/                   # Pointer to production UI
├── steelops-ai/frontend_v2/    # Next.js app — JSPL EAF pages under /eaf/*
└── research/                   # Frozen ML artifacts (runtime + prototype)
    ├── phase_13_industrial_cleaning/   # Historical dataset
    ├── phase_16_feature_engineering/   # Engineered features dataset
    ├── phase_18_final_feature_selection/ # Feature list exports
    ├── phase_19_model_development/     # production_model.pkl
    ├── phase_20_recipe_optimizer/        # Phase 20.2 optimizer
    ├── phase_21_streamlit_app/         # ML integration modules (+ Streamlit prototype)
    └── phase_22_final_validation/      # Validation reports
```

| Path | Role |
|------|------|
| `backend/` | FastAPI REST API |
| `frontend/` | Pointer to production UI |
| `steelops-ai/frontend_v2/` | Next.js app (JSPL EAF pages under `/eaf/*`) |
| `research/` | Frozen ML pipeline artifacts (do not retrain) |

## Documentation

- [API Reference](backend/API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Streamlit prototype README](research/phase_21_streamlit_app/README.md)

## Model

- **Stacking Regressor** — MAE 3.06 min, R² 0.366, 22 features
- **Optimizer** — Phase 20.2 physics-guided local search

## License

Internal use — JSPL
