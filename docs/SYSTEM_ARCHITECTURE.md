# System Architecture — JSPL EAF Industrial AI Decision Support

## Overview

Unified platform exposing frozen research artifacts (Phases 19–32) through a single Next.js frontend and FastAPI backend.

```
Operator UI (Next.js v3)
    ├── /predict          → Phase 19 model (frozen)
    ├── /optimize         → Phase 20.2 optimizer (frozen)
    ├── /hybrid/evaluate  → Phase 32 trust framework (read-only bridge)
    ├── /optimize/v2      → Phase 31 V2 (research, planning-safe)
    ├── /validation       → Plant result recording
    └── /feedback         → Operator review (research store)
```

## Layers

| Layer | Technology | Phase |
|-------|------------|-------|
| Prediction | CatBoost ensemble + Phase 21 feature pipeline | 19 |
| Production optimizer | Physics-guided search | 20.2 |
| Research optimizer | Multi-objective, no POWER changes | 31 |
| Trust / consensus | Hybrid decision engine | 32 |
| Explainability | Post-hoc SHAP + narratives | 29 |
| Product integration | Website + validation APIs | 33 |

## Data flow

1. Operator enters planning recipe (HM, DRI, flux, shift).
2. Backend normalizes inputs and runs frozen `predict_recipe()` — never retrained in Phase 33.
3. Optional `hybrid/evaluate` loads Phase 32 engine via `research_bridge_service` (sys.path bridge only).
4. Optimizer page can run Phase 20.2 and Phase 31 V2 in parallel for comparison.

## Deployment

- Backend: `backend/` FastAPI on port 8001
- Frontend: `steelops-ai/frontend_v2/` Next.js
- Research code: `research/phase_*` — imported read-only, not copied into pickles

## Non-goals (Phase 33)

- No model retraining
- No pickle or weight changes
- No modification to Phase 19/20/31/32 core modules
