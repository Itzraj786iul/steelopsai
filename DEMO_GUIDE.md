# Demo Guide — JSPL EAF Industrial AI v1.0.0

**Duration:** 10–15 minutes  
**Audience:** JSPL plant engineers, internship guide, thesis committee  
**Prerequisites:** Backend running (`uvicorn` on port 8001), frontend (`npm run dev` or production build)

---

## Setup (2 min before demo)

1. Open `http://localhost:3000/eaf/dashboard`
2. Confirm footer shows **Backend Connected** (green)
3. Click **New Heat** — enter Heat ID `DEMO-001`, Shift B, 120 t charge
4. Keep sticky **Heat Status** panel visible (desktop right / mobile bottom)

---

## Scenario 1 — Normal Heat (~3 min)

**Story:** Standard 120 t heat, default recipe.

| Step | Page | Action | Highlight |
|------|------|--------|-----------|
| 1 | Dashboard | Show shift KPIs, heat queue, furnace timeline | Operations view (Phase 36) |
| 2 | Prediction | Run predict with default recipe | TTT ~**39.9 min**, Medium confidence |
| 3 | — | Expand explainability | Similar heats, SHAP contributors |
| 4 | Heat Status | Confirm lifecycle: Created → Predicted | Session persistence |

**Talking point:** Prediction uses frozen Phase 19 model — no retraining in this release.

---

## Scenario 2 — Outlier Heat (~2 min)

**Story:** Unusual operating point to show advisory warnings.

| Step | Action | Highlight |
|------|--------|-----------|
| 1 | Prediction | Set TOTAL_CHARGE to **150 t** OR DOLO above P95 | Warning badges appear |
| 2 | — | Run predict | System accepts input with advisory — does not crash |
| 3 | Historical | Compare against P5/P95 bands | Out-of-band variables flagged |

**Talking point:** Industrial AI should warn, not reject realistic plant inputs.

---

## Scenario 3 — Optimizer (~2 min)

**Story:** Reduce tap-to-tap time with physics-guided recommendations.

| Step | Page | Action | Highlight |
|------|------|--------|-----------|
| 1 | Optimizer | Run optimize on current recipe | ~1 min saving on default |
| 2 | — | Review change cards | Variable-level deltas |
| 3 | — | Click **Accept Recommendation** | Audit trail updated |
| 4 | Research nav | Open Optimizer V2 (`?mode=research`) | POWER unchanged by design |

**Talking point:** Production optimizer (Phase 20.2) vs research V2 (Phase 31) side by side.

---

## Scenario 4 — Validation (~2 min)

| Step | Page | Action | Highlight |
|------|------|--------|-----------|
| 1 | Validation | Enter actual TTT (e.g. 41.2 min) | Auto-computed error |
| 2 | Validation Center | Show aggregated metrics | MAE trend, entry history |
| 3 | Reports | Export PDF report | Includes prediction + optimization |

---

## Scenario 5 — Executive Dashboard (~1 min)

| Page | Highlight |
|------|-----------|
| Dashboard | Today's production, alerts, operator activity, daily export |
| Performance | Client-side latency samples from predict/optimize calls |

---

## Scenario 6 — Explainability (~1 min)

| Page | Highlight |
|------|-----------|
| Explainability Center | SHAP interpretations, similar heats, quality score |
| Prediction Audit | Timestamped prediction history |
| Recommendation Audit | Accepted vs pending recommendations |

---

## Scenario 7 — Digital Twin Roadmap (~1 min)

| Page | Highlight |
|------|-----------|
| Digital Twin Readiness | Sensor coverage, information gain chart |
| Research → Timeline | Phases 16–37 research arc |
| Deployment Readiness | Checklist for production pilot |

---

## Closing (1 min)

1. **Settings** → Plant Configuration (furnace name, shift defaults)
2. **Session Backup** → Export session JSON (audit + heat state)
3. **Versions** → Show v1.0.0 registry aligned with `GET /version`

**Closing statement:** v1.0.0 is a release candidate — ML frozen, frontend hardened. Next step is real heat validation at JSPL, not new feature development.

---

## Troubleshooting During Demo

| Issue | Fix |
|-------|-----|
| Backend offline | Start `uvicorn app.main:app --port 8001` from `backend/` |
| Slow first prediction | ML warmup — wait 15 s after backend start |
| Empty heat state | Click **New Heat** first |
| Hybrid timeout | Normal — explain it runs full evaluation stack |

---

## Demo Do-Nots

- Do not claim real-time MES integration (future work)
- Do not retrain or modify pickles during demo
- Do not use Quick Actions as second navbar (removed by design)
