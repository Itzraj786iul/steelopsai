# JSPL EAF TTT REST API — Release 1.0

Base URL: `http://localhost:8001`

Interactive docs: `/docs` | OpenAPI: `/openapi.json`

**Version:** 1.0.0 (Release 1.0 — Industrial Demonstration Ready)

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health, model/optimizer load status, version registry |
| GET | `/version` | Frontend/backend/model/optimizer/research version registry |
| GET | `/model-info` | Phase 19 model metadata and features |
| POST | `/predict` | Predict TTT with CI, warnings, and explainability |
| POST | `/optimize` | Phase 20.2 physics-guided recipe optimization |
| POST | `/optimize/v2` | Phase 31 Optimizer V2 (research — never optimizes POWER) |
| POST | `/hybrid/evaluate` | Phase 32 hybrid trust framework |
| POST | `/whatif` | Tornado sensitivity analysis |
| GET | `/historical` | Historical comparison (default recipe) |
| POST | `/historical` | Historical comparison + distributions |
| GET | `/historical/statistics` | Full min/P5/median/P95/max/mean/std |
| POST | `/process-health` | Process health gauges |
| GET | `/report?format=json\|csv\|pdf` | Report for default recipe |
| POST | `/report` | Report for custom recipe |
| GET | `/validation` | Plant validation history + MAE/RMSE |
| POST | `/validation` | Record plant validation result |
| GET | `/feedback` | Operator feedback history |
| POST | `/feedback` | Submit operator feedback |
| GET | `/feedback/summary` | Acceptance rate summary |
| GET | `/reliability/summary` | Reliability dashboard aggregates |
| GET | `/deployment/readiness` | Traffic-light readiness assessment |

## Default recipe

```json
{
  "HM": 56.8, "DRI": 63.2, "HBI": 0, "Bucket": 0,
  "LIME": 9.9, "DOLO": 2.5, "CPC": 576,
  "POWER": 29985, "OXY": 3911,
  "Shift": "B", "Power_Restriction": 0
}
```

Expected prediction: **~39.9 min** (120 t total charge).

## Industrial validation

- Total charge is never a hard rejection criterion.
- Out-of-band inputs return `validation_warnings` and `confidence` instead of HTTP 422.
- Request field `POWER` = Electrical Energy (kWh) in responses.

## Explainability (Phase 29)

Optional `explainability` on `/predict` and `/optimize` — no additional ML inference.

### `POST /predict` — explainability fields

`similar_heats`, `contributor_interpretations`, `prediction_quality`, `industrial_observations`, `digital_twin_readiness`, `historical_similarity_pct`, `industrial_risk`

### `POST /optimize` — explainability fields

`validated_recommendations`, `recommendation_confidence`, `recommendation_stability`, `top5_alternatives`, `recommendation_narrative`, `penalty_breakdown`, `similar_heats`, `digital_twin_readiness`

## Phase 31 V2 (`POST /optimize/v2`)

- `power_optimized`: always `false`
- `recommendations[]`: top 5 with `physics_score`, `industrial_score`, `explanation`
- Does not replace `/optimize` (Phase 20.2)

## Phase 32 Hybrid (`POST /hybrid/evaluate`)

- `reliability_index`, `ai_confidence`, `physics_confidence`, `industrial_confidence`
- `historical_similarity_pct`, `recommendation_stability`, `consensus`, `decision_tree`

## Phase 33 validation

- `POST /validation`: record heat_number, predicted_ttt, actual_ttt, optimizer_used
- `GET /validation`: returns entries + metrics (MAE, RMSE, bias, MAPE)

## Version registry (`GET /version`)

```json
{
  "frontend_version": "1.0.0",
  "backend_version": "1.0.0",
  "research_phase": "Phase 33 (frozen)",
  "model_phase": "Phase 19",
  "optimizer_phase": "Phase 20.2"
}
```

## PDF export

See `release/API_REFERENCE.pdf` for printable reference.
