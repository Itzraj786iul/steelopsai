# Thesis Appendix

## System summary

Industrial AI decision support for JSPL EAF tap-to-tap prediction and recipe optimization, integrating physics constraints, ML prediction (Phase 19), dual optimizers (20.2 + 31 V2), and hybrid trust framework (Phase 32).

## Key results

| Component | Result |
|-----------|--------|
| Prediction test MAE | ~2.1 min |
| Default 120 t prediction | ~39.9 min |
| Hybrid reliability (live heats) | 68–78 / 100 |
| Optimizer V2 | Planning-safe, no POWER optimization |

## Figures

Export from:

- `research/phase_33_industrial_product_validation/thesis_figures/`
- `research/phase_33_industrial_product_validation/publication_figures/`

Includes: SHAP importance, optimizer comparison, reliability distribution, digital twin roadmap.

## Limitations

- Actual TTT not yet available for latest live heats
- Sensor gaps per Phase 27 limit digital twin readiness
- POWER recommendations from Phase 20.2 conflict with planning policy — use V2 for burden/flux only

## Future work

See `research/phase_33_industrial_product_validation/phase_34_future_work.md`
