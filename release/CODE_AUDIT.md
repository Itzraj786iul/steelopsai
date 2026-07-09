# Release 1.0 — Code Audit Summary

**Date:** July 2026  
**Scope:** Stabilization only — no ML artifact changes

## Production stack (authoritative)

| Layer | Path | Version |
|-------|------|---------|
| Backend API | `backend/` | 1.0.0 |
| Frontend UI | `steelops-ai/frontend_v2/` | 1.0.0 |
| Frozen model | `research/phase_19_model_development/` | Phase 19 |
| Frozen optimizer | `research/phase_20_recipe_optimizer/` | Phase 20.2 |

## API surface

- **21 routes** in `backend/app/routers/api.py` (20 API + root `/`)
- **8 services** — all referenced, no orphans
- **51/51** automated checks passed (`release/verification_results.json`)

## Frontend surface

- **33 Next.js routes** (24 EAF + auth + landing)
- **15 core EAF pages** verified present
- Navigation centralized in `src/lib/navigation.ts`

## Removed dead code (Release 1.0 cleanup)

### Legacy preheat/copilot stack (unused)
- `src/lib/api/preheat.ts`, `tap-to-tap.ts`, `optimization.ts`, `heats.ts`, `live.ts`, `agents.ts`, `health.ts`
- `src/stores/preheat-store.ts`, `copilot-store.ts`, `celebration-store.ts`, `live-store.ts`, `decision-mode-store.ts`
- `src/services/websocket.ts`, `notifications.ts`

### Unused industrial visualizations
- `furnace.tsx`, `process-flow.tsx`, `recipe-viz.tsx`, `reasoning-viz.tsx`, `material-energy.tsx`, `prediction.tsx`, `primitives.tsx`
- `visualization/furnace-visualization.tsx`
- Kept: `gauges.tsx`, `chart-theme.ts`, `types.ts` (used by health/model pages)

### Unused feature components
- `prediction-confidence.tsx` (replaced by Phase 32 trust framework)

## Preserved (intentionally)

- `research/phase_21_streamlit_app/` — runtime modules imported by backend
- All `research/phase_*` folders — frozen research artifacts
- Phase 33 integration services — unchanged
- `ml_service.py` prediction/optimization cores — unchanged

## Documentation alignment

| File | Status |
|------|--------|
| `backend/API.md` | Updated to 1.0.0, all 20 endpoints |
| `docs/*.md` | 8 thesis/deployment documents |
| `release/*.pdf` | 6 PDF deliverables generated |
| Root `README.md` | Release 1.0 overview |

## Gitignore additions

- `catboost_info/`, `**/catboost_info/`
- `backend/_phase_29_1_results.json`
- `backend/data/phase_33/`

## Known non-blockers

- `package-lock.json` may show stale nested version until `npm install`
- Streamlit prototype (`phase_21`) retains separate `APP_VERSION = 2.0`
- RBAC rules reference legacy routes (`/copilot`) — no active pages, harmless

## Consistency verification

| Check | Result |
|-------|--------|
| Default recipe TTT | 39.90 min |
| Phase 20.2 improvement | 0.96 min |
| Phase 31 V2 POWER | unchanged |
| Hybrid reliability | 0–100 range |
| Model features | 22 |
