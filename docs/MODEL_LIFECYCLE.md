# Model Lifecycle

## Frozen production model (Phase 19)

- **Artifact**: Ensemble pickles under `research/phase_19_*`
- **Features**: Phase 21 `prediction_engine.py` + `feature_engineering.py`
- **Metrics**: Test MAE ~2.1 min (hold-out cohort)
- **Status**: Deployed — changes require new research phase and validation gate

## Lifecycle stages

1. **Research** — Phases 23–26 feature and leakage audits
2. **Validation** — Phase 24.5 ablation, Phase 29.1 live HMI heats
3. **Deployment** — Phase 28 backend + Phase 33 product integration
4. **Monitoring** — `/eaf/validation` MAE/RMSE once actual TTT available
5. **Feedback** — Operator reviews stored in `backend/data/phase_33/` (no retraining)

## Version registry

- Backend `APP_VERSION`: 1.0.0
- `GET /version` returns model_phase=Phase 19, optimizer_phase=Phase 20.2, research_phase=Phase 33

## Retirement policy

Legacy optimizers and models remain in `research/` for reproducibility. Production endpoints only load Phase 19 + 20.2.
