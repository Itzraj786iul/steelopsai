# JSPL EAF TTT REST API

Base URL: `http://localhost:8001`

Interactive docs: `/docs`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service and model health |
| GET | `/model-info` | Model metadata and features |
| POST | `/predict` | Predict TTT with confidence interval |
| POST | `/optimize` | Physics-guided recipe optimization |
| POST | `/whatif` | Tornado sensitivity analysis |
| GET | `/historical` | Historical comparison (default recipe) |
| POST | `/historical` | Historical comparison + distributions |
| GET | `/report?format=json` | Download report for default recipe |
| POST | `/report` | Download JSON, CSV, or PDF report |

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

## Example

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{"HM":56.8,"DRI":63.2,"HBI":0,"Bucket":0,"LIME":9.9,"DOLO":2.5,"CPC":576,"POWER":29985,"OXY":3911,"Shift":"B","Power_Restriction":0}'
```

## Artifacts (frozen)

- `research/phase_19_model_development/exports/production_model.pkl`
- `research/phase_19_model_development/exports/preprocessing_pipeline.pkl`
- `research/phase_20_recipe_optimizer/exports/recipe_optimizer.pkl` (optional cache)

Logic is imported from `research/phase_21_streamlit_app/` without modification.
