# Release Notes — JSPL EAF Industrial AI v1.0.0

**Release date:** July 2026  
**Codename:** Release 1.0 — Industrial Demonstration Ready

## Overview

Release 1.0 is the first production-ready package of the JSPL EAF Tap-to-Tap Industrial AI Decision Support System. The ML research pipeline (Phases 16–33) is **frozen**. This release focuses on stabilization, documentation, validation, and deployment readiness for thesis defense, JSPL demonstration, GitHub portfolio, and publication.

## What's included

### Production stack
- **Backend:** FastAPI v1.0.0 — 20 REST endpoints
- **Frontend:** Next.js `frontend_v2` — 24 EAF pages + auth
- **Frozen ML:** Phase 19 prediction, Phase 20.2 optimizer

### Integrated research (read-only)
- Phase 29 explainability (SHAP, similar heats, narratives)
- Phase 31 Optimizer V2 (planning-safe, research mode)
- Phase 32 Hybrid trust framework (Reliability Index, consensus)
- Phase 33 validation, feedback, reliability dashboard

### Release deliverables (`release/`)
| Artifact | Description |
|----------|-------------|
| `FINAL_TECHNICAL_REPORT.pdf` | Complete technical summary |
| `THESIS_APPENDIX.pdf` | Thesis-ready appendix |
| `USER_MANUAL.pdf` | Operator guide |
| `API_REFERENCE.pdf` | REST API documentation |
| `SYSTEM_ARCHITECTURE.pdf` | Architecture documentation |
| `DEPLOYMENT_GUIDE.pdf` | Deployment instructions |
| `VERIFICATION_CHECKLIST.md` | Component pass/fail matrix |
| `figures/architecture/` | System architecture diagrams |
| `figures/thesis/` | Thesis figures (from Phases 24–32) |
| `figures/publication/` | Publication figures (Phase 27) |

## API endpoints (20)

`GET /health`, `/version`, `/model-info`, `/historical`, `/historical/statistics`, `/report`, `/validation`, `/feedback`, `/feedback/summary`, `/reliability/summary`, `/deployment/readiness`  
`POST /predict`, `/optimize`, `/optimize/v2`, `/hybrid/evaluate`, `/whatif`, `/historical`, `/process-health`, `/report`, `/validation`, `/feedback`

## Verification highlights

- Default recipe prediction: ~39.9 min (120 t charge)
- Phase 20.2 optimizer: non-negative improvement on default recipe
- Phase 31 V2: `power_optimized = false`, POWER unchanged
- Phase 32 hybrid: Reliability Index 0–100, consensus label
- Frontend build: 33 static routes

## Frozen — not modified in Release 1.0

- Phase 19 prediction model & pickles
- Phase 20.2 optimizer
- Phase 31 Optimizer V2 engine
- Phase 32 Hybrid Engine
- Phase 33 integration logic
- Feature engineering & training pipeline

## Known limitations

- Actual TTT for recent live HMI heats pending MES sync
- Digital twin readiness limited by sensor gaps (Phase 27)
- Operator feedback stored for research only — no retraining

## Upgrade from v3.0.0 (Phase 33)

Product version renumbered to **1.0.0** for release. All Phase 33 functionality retained. No breaking API changes.

## Documentation

- `docs/` — Markdown source documentation
- `README.md` — Project overview
- `release/RELEASE_NOTES_v1.0.md` — This file
