# Changelog — v1.0.0 (Release Candidate)

All notable changes for the **1.0.0 Release Candidate** (Phase 38 — Product Stabilization, QA & Industrial Validation).

**Release date:** 2026-07-10  
**Policy:** No new features after Phase 38. Defect fixes only.

---

## [1.0.0] — 2026-07-10 — Release Candidate

### Added (Phases 35–37, finalized in Phase 38)

- **Production UX (Phase 35):** Sticky Heat Status panel, prediction completion dashboard, optimizer change cards, heat lifecycle timeline, recommendation acceptance, validation auto-metrics, Production/Research nav split
- **Shift Operations Dashboard (Phase 36):** Heat queue, furnace timeline, executive KPIs, plant alerts, operator activity, daily production export
- **Enterprise Readiness (Phase 37):** Prediction/Recommendation audit, version control, system health, explainability center, validation center, documentation hub, session backup, performance monitoring, deployment readiness
- **Release package:** QA checklist, demo guide, known limitations, system validation report

### Fixed (Phase 38)

- Sidebar/mobile nav active state for Optimizer V2 query param (`?mode=research`)
- `Suspense` boundary for `useSearchParams` in sidebar components
- Restored missing `industrialEase` motion import in sidebar
- Removed duplicate navigation (Quick Actions removed from heat panel per operator feedback)

### Removed (Phase 38 dead code cleanup)

- `current-heat-banner.tsx` (unused)
- `current-heat-drawer.tsx` (replaced by sticky panel)
- `production-summary-dashboard.tsx` (replaced by shift operations dashboard)

### Verified unchanged (regression)

- Phase 19 prediction model — default TTT **39.904 min** (120 t)
- Phase 20.2 optimizer — improvement **≥ 0** on default recipe
- Phase 31 Optimizer V2 — `power_optimized: false`, POWER unchanged
- Phase 32 Hybrid — reliability index 0–100
- Backend API contracts — 20 endpoints, no schema changes
- Pickle artifacts — not modified

### Build & quality

- TypeScript: PASS
- ESLint: PASS (0 warnings)
- Production build: PASS (43 static routes)
- Automated verification: **51/51** checks (`release/verify_release.py`)

---

## [Prior] — Phases 16–34

See `VERSION_HISTORY.md` and `/eaf/research/timeline` for the full research and integration arc from data audit through Phase 33 API integration.

---

## Upgrade notes

- Product version renumbered from internal 2.x/3.x tracks to **1.0.0** for release
- No breaking API changes from Phase 33 integration
- Frontend migrates from Streamlit prototype to Next.js `frontend_v2` as sole production UI
