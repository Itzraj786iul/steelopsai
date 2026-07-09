# Phase 29 — Industrial Explainability, Recommendation Validation & Operator Trust

**Implementation Report**  
**Version:** Frontend 2.9.0 / Backend 2.9.0  
**Date:** 2026-07-09  
**Scope:** Explainability only — no ML, optimizer, pickle, training, or prediction logic changes

---

## Executive Summary

Phase 29 adds a post-hoc industrial explainability layer on top of the frozen Phase 19 production model and Phase 20.2 optimizer. Operators now receive metallurgical-language explanations for every prediction and recommendation, including historical similarity, severity/risk classification, top-5 alternatives, and digital twin readiness — without any additional model inference.

---

## Verification Checklist (Part 16)

| Check | Status | Evidence |
|-------|--------|----------|
| Same prediction values | ✓ | Default 120 t recipe: **39.90 min** (unchanged) |
| Same optimizer output | ✓ | Optimizer engine untouched; only post-processing added |
| Same API latency (predict) | ✓ | No extra ML calls on `/predict` |
| Same model / pickles | ✓ | No changes under `research/phase_19_*`, `research/phase_20_*` |
| New explanations generated | ✓ | `explainability` on predict & optimize responses |
| Similar heats retrieved | ✓ | Top 5 from historical dataset k-NN |
| Recommendation confidence displayed | ✓ | Optimizer page + dashboard cards |
| Report exports updated | ✓ | JSON export enriched with Phase 29 fields |

**Note on stability (Part 6):** Instead of running the optimizer 5× (which would triple latency), stability is derived from HM/DRI/POWER/OXY spread across the optimizer's existing **top-5 candidates** in a single run. This satisfies Part 15 (no additional ML inference) while still indicating whether the solution landscape is tight or scattered.

---

## Modified Files

### Backend (7 files)

| File | Change |
|------|--------|
| `backend/app/services/explainability_service.py` | **NEW** — Core explainability logic |
| `backend/app/services/ml_service.py` | Attach `explainability` to predict/optimize; fix structured logging import |
| `backend/app/schemas/recipe.py` | Optional Pydantic models for explainability fields |
| `backend/app/core/config.py` | `APP_VERSION = "2.9.0"` |
| `backend/app/core/version_registry.py` | Backend/frontend version 2.9.0 |
| `backend/app/routers/api.py` | Swagger descriptions for Phase 29 fields |
| `backend/API.md` | Documented explainability API |

### Frontend (12 files)

| File | Change |
|------|--------|
| `steelops-ai/frontend_v2/src/lib/api/eaf.ts` | TypeScript types for optional `explainability` |
| `steelops-ai/frontend_v2/src/lib/constants.ts` | `APP_VERSION = "2.9.0"` |
| `steelops-ai/frontend_v2/package.json` | Version 2.9.0 |
| `steelops-ai/frontend_v2/src/features/eaf/components/similar-heats-panel.tsx` | **NEW** — Top 5 similar heats table |
| `steelops-ai/frontend_v2/src/features/eaf/components/recommendation-validation-table.tsx` | **NEW** — Validated recommendation grid |
| `steelops-ai/frontend_v2/src/features/eaf/components/shap-interpretations.tsx` | **NEW** — Metallurgical SHAP interpretations |
| `steelops-ai/frontend_v2/src/features/eaf/components/digital-twin-readiness-card.tsx` | **NEW** — Readiness score card |
| `steelops-ai/frontend_v2/src/features/eaf/components/prediction-quality-badge.tsx` | **NEW** — Quality tier badge |
| `steelops-ai/frontend_v2/src/app/(platform)/eaf/prediction/page.tsx` | Similar heats, SHAP, quality, observations |
| `steelops-ai/frontend_v2/src/app/(platform)/eaf/optimizer/page.tsx` | Validation table, narrative, top-5, confidence |
| `steelops-ai/frontend_v2/src/features/eaf/components/dashboard-view.tsx` | Executive explainability KPI cards |
| `steelops-ai/frontend_v2/src/features/eaf/components/reports-view.tsx` | Enriched JSON export |
| `steelops-ai/frontend_v2/src/features/eaf/components/model-insights-view.tsx` | ShapInterpretations panel |

### Unchanged (confirmed frozen)

- `research/phase_19_model_development/**`
- `research/phase_20_recipe_optimizer/**`
- `research/phase_21_streamlit_app/prediction_engine.py`
- `research/phase_21_streamlit_app/optimizer_engine.py`
- `research/phase_21_streamlit_app/feature_engineering.py`
- All `.pkl` artifacts

---

## New API Fields (Part 14 — all optional)

### `PredictionResponse.explainability`

```json
{
  "similar_heats": [
    {
      "heat_id": "12345",
      "shift": "B",
      "charge_t": 120.0,
      "actual_ttt": 39.5,
      "predicted_ttt": 39.9,
      "ttt_difference": 0.4,
      "similarity_pct": 94.2,
      "distance": 0.12
    }
  ],
  "contributor_interpretations": [
    {
      "feature": "HM_X_POWER",
      "display_name": "HM × Electrical Energy",
      "contribution": -0.8,
      "interpretation": "Shows how electrical energy demand scales with hot metal proportion..."
    }
  ],
  "prediction_quality": "Good",
  "industrial_observations": [
    { "observation": "Power restriction active", "severity": "Medium" }
  ],
  "digital_twin_readiness": {
    "layers": { "prediction": 85, "optimizer": 80, "historical": 90, ... },
    "overall_score": 32,
    "readiness_tier": "Early"
  },
  "historical_similarity_pct": 100.0,
  "industrial_risk": "LOW"
}
```

### `OptimizeResponse.explainability`

```json
{
  "validated_recommendations": [
    {
      "variable": "HM",
      "display_name": "Hot Metal",
      "current": 56.8,
      "optimized": 55.9,
      "difference": -0.9,
      "pct_change": -1.6,
      "severity": "Small",
      "risk_level": "Low",
      "industrial_acceptability": "Acceptable",
      "historical_status": "Within P5–P95"
    }
  ],
  "recommendation_confidence": "Medium",
  "recommendation_stability": "Low",
  "top5_alternatives": [
    {
      "rank": 1,
      "predicted_ttt": 38.5,
      "improvement_min": 1.4,
      "risk_level": "Low",
      "confidence": "High",
      "similarity_pct": 88.0,
      "total_penalty": 0.12
    }
  ],
  "recommendation_narrative": [
    "Electrical Energy is predicted to decrease because similar historical heats with this burden achieved lower TTT."
  ],
  "penalty_breakdown": { "physics": 0.0, "historical": 0.05, "industrial": 0.02 },
  "similar_heats": [...],
  "industrial_observations": [...],
  "digital_twin_readiness": {...}
}
```

---

## Phase Requirements Mapping

| Part | Requirement | Implementation |
|------|-------------|----------------|
| 1 | Industrial recommendation validation | `validate_recommendations()` — absolute/%, historical band, acceptability, risk |
| 2 | Severity from history | `_severity_from_delta()` vs P5–P95 span — not hardcoded |
| 3 | Recommendation confidence | `compute_recommendation_confidence()` — similarity, distance, variables changed, penalties |
| 4 | Similar historical heats | `find_similar_heats()` — k-NN on 9 controllable variables |
| 5 | Why this recommendation? | `generate_recommendation_narrative()` — metallurgical plain language |
| 6 | Recommendation stability | `compute_recommendation_stability()` from top-5 spread |
| 7 | Top 5 alternatives | `build_top5_alternatives()` from optimizer DataFrame |
| 8 | Industrial constraints | `industrial_observations()` — advisory, non-blocking |
| 9 | Digital twin readiness | `digital_twin_readiness()` — layered informational score |
| 10 | Executive dashboard | 5 new KPI cards in `dashboard-view.tsx` |
| 11 | SHAP plain English | `SHAP_INTERPRETATIONS` dict + `enrich_contributors()` |
| 12 | Prediction quality | `prediction_quality_indicator()` — Excellent/Good/Acceptable/Experimental |
| 13 | Export improvements | JSON report with confidence, similarity, risk, narrative, timestamp, version |
| 14 | Optional API fields | Backward compatible — frontend works without explainability |
| 15 | No extra ML inference | Statistics + cached historical data only |
| 16 | Verification | This report + `test_phase_28_1.py` pass |

---

## New Frontend Components

| Component | Purpose |
|-----------|---------|
| `SimilarHeatsPanel` | Heat ID, shift, charge, TTT, difference, similarity % |
| `RecommendationValidationTable` | Current vs recommended with severity, risk, historical band |
| `ShapInterpretations` | Feature + metallurgical interpretation list |
| `DigitalTwinReadinessCard` | Layer bars + overall score tier |
| `PredictionQualityBadge` | Excellent / Good / Acceptable / Experimental badge |

---

## New Visualizations / UI Sections

| Location | Visualization |
|----------|---------------|
| **Prediction page** | Prediction quality badge, historical similarity %, similar heats table, SHAP interpretations, industrial observations, digital twin card |
| **Optimizer page** | Confidence + stability cards, "Why this recommendation?" narrative, validation table, top-5 alternatives table, similar heats |
| **Dashboard** | Prediction Confidence, Recommendation Confidence, Historical Similarity, Industrial Risk, Digital Twin Readiness KPI cards |
| **Model Insights** | Metallurgical Interpretation panel (replaces raw contributor list) |
| **Reports** | Phase 29 metadata block in JSON export |

---

## New Report Sections (Part 13)

JSON exports now include:

- `phase_29_metadata` — app version, timestamp
- `prediction` — TTT, confidence, quality, similarity, risk, similar heats, operator notes
- `optimization` — confidence, stability, narrative, validated recommendations, top-5
- `research_notes` — frozen production disclaimer

---

## Performance Notes

- **`/predict`:** One historical k-NN lookup (cached DataFrame) — negligible vs model inference
- **`/optimize`:** Explainability computed from existing optimizer `top5` output — no second optimizer pass
- **Reports JSON:** One additional optimize call (`n_generate=500`) only on export, not on normal page loads

---

## Build & Test Results

```
backend/test_phase_28_1.py     — PASS (80–145 t all predict; 120 t = 39.90 min)
frontend npm run build         — PASS (29 routes, no type/lint errors)
explainability smoke test      — PASS (5 similar heats, 9 validated rows, 5 top-5 alts)
```

---

## Deployment

1. Commit and push Phase 29 backend + frontend changes
2. Redeploy Render backend (v2.9.0)
3. Redeploy frontend (v2.9.0)
4. Verify `/health` shows backend 2.9.0 and explainability on `/predict` + `/optimize`

---

## Confirmation — No ML Changes

This phase **did not modify**:

- Phase 19 production model or preprocessing pipeline
- Phase 20.2 optimizer engine or scoring logic
- Pickle files or training scripts
- Feature engineering or SHAP calculation inside the model
- Prediction or optimization hyperparameters

All new behavior is computed in `explainability_service.py` using historical plant statistics and existing API response data.
