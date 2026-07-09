# JSPL EAF TTT REST API

Base URL: `http://localhost:8001`

Interactive docs: `/docs`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health, model/optimizer load status, version registry |
| GET | `/version` | Frontend/backend/model/optimizer/research version registry |
| GET | `/model-info` | Model metadata and features |
| POST | `/predict` | Predict TTT with confidence interval and advisory warnings |
| POST | `/optimize` | Physics-guided recipe optimization |
| POST | `/whatif` | Tornado sensitivity analysis |
| GET | `/historical` | Historical comparison (default recipe) |
| POST | `/historical` | Historical comparison + distributions |
| GET | `/historical/statistics` | Full min/P5/median/P95/max/mean/std for all variables |
| GET | `/report?format=json` | Download report for default recipe |
| POST | `/report` | Download JSON, CSV, or PDF report |

## Industrial validation (Phase 28.1)

- Total charge is **never** a hard rejection criterion.
- Realistic heats (80 t, 95 t, 120 t, 131 t, 140 t, 145 t) all return predictions.
- Out-of-band inputs return `validation_warnings` and `confidence` instead of HTTP 422.
- The request field remains `POWER`; responses expose **Electrical Energy (kWh)** in display labels.

## Recipe payload

```json
{
  "HM": 56.8,
  "DRI": 63.2,
  "HBI": 0,
  "Bucket": 0,
  "LIME": 9.9,
  "DOLO": 2.5,
  "CPC": 576,
  "POWER": 29985,
  "OXY": 3911,
  "Shift": "B",
  "Power_Restriction": 0
}
```

## Example — 145 t charge heat

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"HM":72,"DRI":73,"HBI":0,"Bucket":0,"LIME":9.9,"DOLO":2.5,"CPC":576,"POWER":29985,"OXY":3911,"Shift":"B","Power_Restriction":0}'
```

## Prediction response fields

| Field | Description |
|-------|-------------|
| `predicted_ttt` | Tap-to-tap prediction (minutes) |
| `confidence` | High / Medium / Low / Very Low |
| `charge_classification` | Normal / Low / High / Very High / Extreme |
| `validation_warnings` | Advisory messages — never blocking |
| `metadata` | Model version, pipeline phase, timestamp |

## Artifacts (frozen)

- `research/phase_19_model_development/exports/production_model.pkl`
- `research/phase_19_model_development/exports/preprocessing_pipeline.pkl`
- `research/phase_20_recipe_optimizer/exports/recipe_optimizer.pkl` (optional cache)

Prediction and optimization algorithms are unchanged. Phase 28.1 only improves validation, metadata, and API robustness.
