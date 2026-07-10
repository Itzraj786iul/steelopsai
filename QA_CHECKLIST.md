# QA Checklist — Release Candidate v1.0.0 (Phase 38)

**Date:** 2026-07-10  
**Scope:** Frontend stabilization only — no ML, backend, or API changes  
**Automated verification:** `python release/verify_release.py` → **51/51 PASS**

---

## Part 1 — Route Verification (43 static routes)

| Section | Route | Status |
|---------|-------|--------|
| **Production** | `/eaf/dashboard` | ✓ |
| | `/eaf/prediction` | ✓ |
| | `/eaf/optimizer` | ✓ |
| | `/eaf/validation` | ✓ |
| | `/eaf/reports` | ✓ |
| **Research** | `/eaf/optimizer?mode=research` (Optimizer V2) | ✓ |
| | `/eaf/prediction` (Hybrid tab) | ✓ |
| | `/eaf/reliability` | ✓ |
| | `/eaf/digital-twin-readiness` | ✓ |
| | `/eaf/research/timeline` | ✓ |
| **Enterprise** | `/eaf/audit/predictions` | ✓ |
| | `/eaf/audit/recommendations` | ✓ |
| | `/eaf/versions` | ✓ |
| | `/eaf/system-health` | ✓ |
| | `/eaf/explainability` | ✓ |
| | `/eaf/validation-center` | ✓ |
| | `/eaf/docs` | ✓ |
| | `/eaf/deployment-readiness` | ✓ |
| | `/eaf/session-backup` | ✓ |
| | `/eaf/performance` | ✓ |
| **Tools** | `/eaf/whatif`, `/eaf/historical`, `/eaf/health`, `/eaf/model`, `/eaf/feedback` | ✓ |
| | `/eaf/research/*` (8 sub-pages) | ✓ |
| | `/eaf/settings`, `/eaf/about` | ✓ |
| **Auth** | `/`, `/login`, `/register`, `/forgot-password`, `/unauthorized` | ✓ |

**Checks:** No broken links in sidebar/command palette · No missing nav icons · No dead pages · No placeholder Lorem ipsum · Optimizer V2 active state respects `?mode=research`

---

## Part 2 — UI Consistency

| Element | Standard | Status |
|---------|----------|--------|
| Cards | `rounded-lg border bg-card` + consistent padding | ✓ |
| Typography | `text-label`, page titles via PageContainer | ✓ |
| Buttons | shadcn/ui variants (default, outline, ghost) | ✓ |
| Badges | confidence, shift, status chips unified | ✓ |
| Tables | ScrollArea on wide audit tables | ✓ |
| Charts | Recharts with industrial palette | ✓ |
| Empty states | `empty-heat-state.tsx` on workflow pages | ✓ |
| Skeleton loaders | Used on async data views | ✓ |
| Sidebar sections | Production / Enterprise / Research / Tools | ✓ |

---

## Part 3 — Responsive Validation

| Breakpoint | Checks | Status |
|------------|--------|--------|
| Desktop (≥1280px) | Sticky Heat Status panel right · no horizontal scroll | ✓ |
| Laptop (1024–1279px) | Collapsible heat panel · sidebar collapse | ✓ |
| Tablet (768–1023px) | Mobile sidebar sheet · heat bottom bar | ✓ |
| Mobile (<768px) | Single column · touch targets ≥44px | ✓ |

---

## Part 4 — Accessibility

| Check | Status |
|-------|--------|
| Keyboard navigation (Tab, Enter, Escape) | ✓ |
| Focus visible on interactive elements | ✓ |
| Form labels on recipe inputs | ✓ |
| ARIA on dialogs/sheets | ✓ (Radix primitives) |
| Chart tooltips readable | ✓ |
| Offline banner announced | ✓ |
| No duplicate Quick Actions nav (user requirement) | ✓ |

---

## Part 5 — Performance (frontend only)

| Metric | Observation |
|--------|-------------|
| Shared First Load JS | 106 kB |
| Largest route | `/eaf/dashboard` — 351 kB First Load JS |
| Prediction API (warm) | ~450–1100 ms |
| Optimizer API | ~730–1300 ms |
| Hybrid API | ~15–22 s (research evaluation) |
| Page transitions | Framer Motion `pageTransition` |
| Re-render | Zustand selectors on heat/audit stores |

---

## Part 6 — End-to-End Workflow

| Step | Verified |
|------|----------|
| New Heat → store persisted | ✓ |
| Prediction → audit + performance recorded | ✓ |
| Optimizer → recommendation stored | ✓ |
| Accept Recommendation → audit updated | ✓ |
| Validation → metrics computed | ✓ |
| Reports → export JSON/CSV/PDF | ✓ |
| Audit trails → localStorage | ✓ |
| Session Backup → export/import | ✓ |

---

## Part 7 — Error Handling

| Scenario | Expected behavior | Status |
|----------|-------------------|--------|
| Missing inputs | Form validation messages | ✓ |
| NaN / invalid numbers | Blocked at form layer | ✓ |
| Network unavailable | Offline banner + toast | ✓ |
| Backend 5xx | `getApiErrorMessage` user toast | ✓ |
| Timeout | Error boundary + retry guidance | ✓ |
| Large charge (150 t) | Advisory warning, prediction proceeds | ✓ |
| Small charge (80 t) | Advisory warning, prediction proceeds | ✓ |
| Unexpected response | No crash — graceful fallback | ✓ |

---

## Part 8 — Documentation

| Document | Location | Current |
|----------|----------|---------|
| README | `README.md` | ✓ |
| User Manual | `release/USER_MANUAL.pdf` | ✓ |
| API Reference | `release/API_REFERENCE.pdf` | ✓ |
| Architecture | `release/SYSTEM_ARCHITECTURE.pdf` | ✓ |
| Deployment Guide | `release/DEPLOYMENT_GUIDE.pdf` | ✓ |
| Research Timeline | `/eaf/research/timeline` | ✓ |
| Version Registry | `/eaf/versions` + `GET /version` | ✓ |

---

## Part 9 — Code Quality

| Check | Result |
|-------|--------|
| TypeScript (`npm run type-check`) | **PASS** |
| ESLint (`npm run lint`) | **PASS** (0 warnings) |
| Production build (`npm run build`) | **PASS** (43 routes) |
| Dead components removed | banner, drawer, production-summary-dashboard |
| console.log in src | **0** |
| Frozen layers untouched | Phase 19/20.2/31/32/33, pickles, APIs |

---

## Part 10–11 — Demo & Regression

| Regression check | Result |
|------------------|--------|
| Default recipe TTT ~39.9 min | ✓ (39.904 min) |
| Optimizer improvement ≥ 0 | ✓ (~0.96 min saving) |
| V2 POWER unchanged | ✓ |
| Hybrid reliability 0–100 | ✓ |
| Session persistence | ✓ |
| Confidence labels unchanged | ✓ |

---

## Acceptance Summary

| Criterion | Status |
|-----------|--------|
| All routes verified | ✓ |
| Zero broken UI (automated + manual audit) | ✓ |
| Zero console.log | ✓ |
| Responsive | ✓ |
| Accessible (baseline WCAG) | ✓ |
| Production build passes | ✓ |
| TypeScript passes | ✓ |
| ESLint passes | ✓ |
| No dead code (Phase 38 cleanup) | ✓ |
| Complete documentation | ✓ |
| Demo ready | ✓ (see `DEMO_GUIDE.md`) |
| Release package generated | ✓ |
| No ML / backend / API changes | ✓ |

**Release Candidate:** APPROVED
