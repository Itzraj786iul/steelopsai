# Phase 46 — Production neighbour search, CI calibration & planning-safe optimizer

## Goal
Ship operator-facing improvements without replacing Phase 19 pickles:
1. Better **similar-heat search** for recipe comparison
2. **Neighbour-informed prediction CI** (advisory calibration)
3. **Freeze POWER** on the production optimizer path

## Changes

### Similar heats (`explainability_service.find_similar_heats`)
- Distance on **planning variables only** (excludes POWER — post-heat EE)
- Weighted z-scored Euclidean (burden > flux > O₂/CPC)
- Retrieve pool → re-rank by recipe distance + outcome proximity to predicted TTT
- Payload: `recipe_deltas`, `recipe_similarity_pct`, `outcome_similarity_pct`, `truly_similar`, `neighbor_benchmark`

### Predictor (`ml_service.predict_recipe`)
- Phase 19 `predicted_ttt` remains authority
- CI half-width tightens when neighbours agree (high sim + low std); widens when sparse/noisy
- Optional `neighbor_calibrated_ttt` (≤12% blend) for display only

### Optimizer (`optimizer_engine` + `HistoricalSimilarityIndex`)
- `AdjustmentConfig(power_pct=0.0)` — no electrical-energy cuts on production path
- Historical penalty uses planning-weighted distance (aligned with similar-heat search)

### Frontend
- Richer similar-heat card: neighbour band, recipe/outcome match, multi-heat delta table

## Gate
Do **not** auto-promote Phase 42–45 models. Temporal/walk-forward remains the accuracy gate.

## Smoke
```bash
cd backend && python -c "from app.services.ml_service import predict_recipe, optimize_recipe; ..."
```
