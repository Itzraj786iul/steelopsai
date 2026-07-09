# Phase 29.1 — Real Plant Validation Using Live JSPL Heat Reports

**Date:** 2026-07-09  
**Pipeline:** Frozen Phase 19 production model + Phase 20.2 optimizer (via `ml_service`)  
**Optimizer candidates:** 500 per heat  
**Code changes:** None — validation-only run

---

## Executive Summary

Ten live Shift B heats from today's JSPL HMI were run through the production prediction and optimization pipeline. All 10 heats received predictions. **7 of 10** heats produced optimizer recommendations; **3 heats** failed optimizer candidate generation due to tight physics/historical constraints (4618211, 4618210, 4618204).

| Metric | Value |
|--------|-------|
| Average Predicted TTT | **44.91 min** |
| Average Expected Saving (7 successful opts) | **1.62 min** |
| Average Prediction Confidence | **High** (9 High, 1 Low) |
| Highest Saving | **2.84 min** (Heat 4618208) |
| Lowest Saving | **0.54 min** (Heat 4618213) |
| Heats outside historical range | **1** (4618204 — low DRI, high OXY) |
| Optimizer failures | **3** |

---

## Summary Table

| Heat | Predicted TTT | Optimized TTT | Saving | Confidence | Charge (t) | Warnings |
|------|---------------|---------------|--------|------------|------------|----------|
| 4618213 | 43.55 | 43.01 | 0.54 | High | 131.7 | — |
| 4618212 | 41.92 | 40.49 | 1.43 | High | 119.2 | — |
| 4618211 | 47.18 | — | — | High | 114.7 | Optimizer: no valid candidates |
| 4618210 | 46.52 | — | — | High | 113.2 | Optimizer: no valid candidates |
| 4618209 | 44.38 | 42.50 | 1.88 | High | 121.1 | — |
| 4618208 | 47.91 | 45.07 | **2.84** | High | 129.1 | — |
| 4618207 | 45.74 | 43.88 | 1.85 | High | 129.7 | — |
| 4618206 | 43.00 | 41.55 | 1.45 | High | 121.1 | — |
| 4618205 | 41.87 | 40.53 | 1.34 | High | 119.6 | — |
| 4618204 | 46.99 | — | — | **Low** | 90.1 | DRI below range; OXY above P95; Optimizer failed |

---

## Per-Heat Detail

### Heat 4618213 — 131.7 t

| Field | Value |
|-------|-------|
| Predicted TTT | 43.55 min |
| 95% Interval | 40.65 – 46.45 min |
| Confidence | High |
| Charge Classification | Normal |
| Historical Similarity | 87.8% |
| Industrial Risk | LOW |
| Rec. Confidence / Stability | Medium / Low |

**Best recipe:** HM 63.9, DRI 41.4, Bucket 26.5, LIME 8.6, DOLO 1.2, CPC 726, Power 35,061 kWh, OXY 3,429  
**Top saving alternative:** Rank 1 — 43.01 min (−0.54 min), similarity 86.9%

---

### Heat 4618212 — 119.2 t

| Field | Value |
|-------|-------|
| Predicted TTT | 41.92 min |
| 95% Interval | 39.02 – 44.82 min |
| Confidence | High |
| Historical Similarity | 87.3% |
| Optimized TTT / Saving | 40.49 min / **1.43 min** |
| Rec. Confidence / Stability | Medium / Low |

**Best recipe:** HM 59.6, DRI 44.1, Bucket 15.5, CPC 875, Power 32,704 kWh, OXY 3,119

---

### Heat 4618211 — 114.7 t

| Field | Value |
|-------|-------|
| Predicted TTT | 47.18 min |
| 95% Interval | 44.28 – 50.08 min |
| Confidence | High |
| Historical Similarity | 82.3% |
| Optimizer | **Failed** — no valid local candidates (CPC 392 t unusually low) |

---

### Heat 4618210 — 113.2 t

| Field | Value |
|-------|-------|
| Predicted TTT | 46.52 min |
| 95% Interval | 43.62 – 49.42 min |
| Confidence | High |
| Historical Similarity | 80.1% |
| Optimizer | **Failed** — no valid local candidates (CPC 270 t, Power 39,332 kWh at upper band) |

---

### Heat 4618209 — 121.1 t (no bucket scrap)

| Field | Value |
|-------|-------|
| Predicted TTT | 44.38 min |
| Optimized TTT / Saving | 42.50 min / **1.88 min** |
| Historical Similarity | 86.3% |
| Rec. Confidence / Stability | Medium / Low |

**Pattern:** HM ↓ slightly, DRI ↑ slightly, Power ↓ ~1,712 kWh, OXY trim

---

### Heat 4618208 — 129.1 t (high DRI 69.1 t)

| Field | Value |
|-------|-------|
| Predicted TTT | 47.91 min (longest predicted) |
| Optimized TTT / Saving | 45.07 min / **2.84 min** (highest saving) |
| Observations | High DRI level; lime/dolomite imbalance |
| Rec. Confidence / Stability | Medium / Low |

---

### Heat 4618207 — 129.7 t

| Field | Value |
|-------|-------|
| Predicted TTT | 45.74 min |
| Optimized TTT / Saving | 43.88 min / **1.85 min** |
| Historical Similarity | 81.5% |

---

### Heat 4618206 — 121.1 t

| Field | Value |
|-------|-------|
| Predicted TTT | 43.00 min |
| Optimized TTT / Saving | 41.55 min / **1.45 min** |
| Historical Similarity | 86.0% |

---

### Heat 4618205 — 119.6 t

| Field | Value |
|-------|-------|
| Predicted TTT | 41.87 min (shortest predicted) |
| Optimized TTT / Saving | 40.53 min / **1.34 min** |
| Historical Similarity | 84.2% |

---

### Heat 4618204 — 90.1 t (outlier)

| Field | Value |
|-------|-------|
| Predicted TTT | 46.99 min |
| 95% Interval | 44.09 – 49.89 min |
| Confidence | **Low** |
| Historical Similarity | **66.1%** |
| Industrial Risk | **MEDIUM** |
| Warnings | DRI (25.1 t) below historical range; OXY (4,802 Nm³) above P95 |
| Optimizer | **Failed** — no valid candidates |

---

## Common Optimizer Recommendations (7 successful heats)

Variables adjusted in most optimized recipes:

| Variable | Heats Adjusted |
|----------|----------------|
| HM | 7/7 |
| DRI | 7/7 |
| LIME | 7/7 |
| CPC | 7/7 |
| Electrical Energy (kWh) | 7/7 (typically −1,400 to −1,700 kWh) |
| OXY | 7/7 |
| Bucket (scrap) | 5/7 |
| DOLO | 2/7 |

**Dominant metallurgical pattern:** Slight HM↔DRI rebalance while holding total charge, modest electrical energy reduction (~3–5%), minor flux/carbon trim, small scrap reduction where bucket charge is present.

**Electrical energy note:** All 7 successful optimizations flagged power reduction as "Review physics" — the optimizer trades ~1–2% power for TTT improvement while staying within historical P5–P95.

---

## Industrial Observations (across all heats)

| Observation | Count |
|-------------|-------|
| Lime/dolomite ratio may be imbalanced | 3 |
| High DRI level | 1 (4618208) |
| High oxygen versus plant history | 1 (4618204) |

---

## Recommendation Confidence & Stability

All 7 successful optimizations returned **Medium** recommendation confidence and **Low** recipe stability — indicating the top-5 candidate recipes vary across HM/DRI/Power/OXY, so operators should treat recommendations as directional rather than a single fixed setpoint.

---

## Key Findings

1. **Predictions are stable and confident** for 9/10 heats (41.9–47.9 min range), consistent with 113–132 t charge practice on Shift B.
2. **Heat 4618204 is an outlier** — low total charge (90.1 t), very low DRI (25.1 t), high oxygen; lowest historical similarity (66%) and only Low-confidence prediction.
3. **Optimizer is conservative** — typical savings 0.5–2.8 min; fails on extreme/unusual recipes rather than forcing invalid recommendations.
4. **Failed optimizer heats** share unusual operating points: very low CPC (4618210/4618211) or out-of-band DRI/OXY (4618204).
5. **No production code was modified** — all results from existing `predict_recipe()` and `optimize_recipe()` pipeline.

---

## Raw Data

Full JSON results: `backend/_phase_29_1_results.json` (generated during validation run)
