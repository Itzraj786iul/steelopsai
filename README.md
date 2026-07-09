# JSPL EAF Tap-to-Tap Time — Industrial AI Platform

**Release 1.0.0** — Production-ready Industrial AI Decision Support System.

Frozen ML research (Phases 16–33). Suitable for B.Tech thesis, JSPL demonstration, GitHub portfolio, and publication.

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

## Architecture

- **Prediction:** Phase 19 frozen model via `POST /predict`
- **Production optimizer:** Phase 20.2 via `POST /optimize`
- **Research optimizer:** Phase 31 V2 via `POST /optimize/v2` (never optimizes POWER)
- **Trust framework:** Phase 32 via `POST /hybrid/evaluate`
- **Validation:** `POST /validation`, operator feedback, reliability dashboard

See [docs/SYSTEM_ARCHITECTURE.md](docs/SYSTEM_ARCHITECTURE.md).

## Structure

```
Data 2/
├── backend/                    # FastAPI REST API (production)
├── docs/                       # Phase 33 thesis & deployment documentation
├── steelops-ai/frontend_v2/    # Next.js app — /eaf/*
└── research/                   # Frozen ML + research phases (read-only at runtime)
    ├── phase_19_model_development/
    ├── phase_20_recipe_optimizer/
    ├── phase_31_optimizer_v2/
    ├── phase_32_hybrid_decision_engine/
    └── phase_33_industrial_product_validation/
```

## Website (Release 1.0)

| Page | Purpose |
|------|---------|
| `/eaf/prediction` | TTT + Phase 32 trust metrics |
| `/eaf/optimizer` | Production vs V2 comparison |
| `/eaf/validation` | Actual plant results |
| `/eaf/reliability` | Trust aggregates |
| `/eaf/feedback` | Operator recommendation review |
| `/eaf/deployment-readiness` | Traffic-light readiness |

## Documentation

- [Release Notes](release/RELEASE_NOTES_v1.0.md)
- [Verification Checklist](release/VERIFICATION_CHECKLIST.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [User Manual](docs/USER_MANUAL.md)
- [API Reference](backend/API.md)
- [Thesis Appendix](docs/THESIS_APPENDIX.md)

## Results

- **Prediction:** Test MAE ~2.1 min (Phase 19 hold-out)
- **Hybrid reliability:** 68–78 / 100 on live HMI heats (Phase 32)
- **Optimizer V2:** Planning-safe; POWER immutable

## Limitations

- Actual TTT for latest live heats pending MES import
- Digital twin sensor gaps (Phase 27)
- Operator feedback does not retrain models

## Future work

[phase_34_future_work.md](research/phase_33_industrial_product_validation/phase_34_future_work.md)

## License

Internal use — JSPL
