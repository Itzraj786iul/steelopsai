# Platform Integration — Phase 22

The JSPL EAF TTT platform consists of:

- **Backend:** `backend/` — FastAPI on port 8001
- **Frontend:** `steelops-ai/frontend_v2/` — Next.js on port 3000
- **Prototype:** `research/phase_21_streamlit_app/` — Streamlit (not production)

## Validation

```bash
cd backend && python -c "from app.services.ml_service import ml_service; print(ml_service.health())"
cd research/phase_21_streamlit_app && python validate_app.py
```

## Status

- REST APIs: `/predict`, `/optimize`, `/whatif`, `/health`, `/model-info`, `/historical` (GET+POST), `/report` (GET+POST), `/process-health`
- Frontend routes: `/`, `/eaf/*` (no login required)
- Frozen model: unchanged
- Optimizer logic: unchanged (imported from Phase 20.2)

## Verified performance (warm server)

| Endpoint | Latency |
|----------|---------|
| Startup | ~4.4 s |
| POST /predict | ~160–350 ms |
| POST /optimize (1000) | ~1.5 s |
| GET /historical | ~18 ms |
