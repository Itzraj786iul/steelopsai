# Industrial Validation

## Live validation (Phase 29.1)

Ten HMI heats (4618213–4618204, Shift B) evaluated with frozen model. Actual TTT pending MES sync.

## Phase 33 validation module

- **Route**: `/eaf/validation`
- **API**: `GET/POST /validation`
- **Metrics**: MAE, RMSE, bias, MAPE when actual TTT provided

## Hybrid A/B (Phase 32)

`research/phase_32_hybrid_decision_engine/hybrid_ab_evaluation.csv` — Reliability Index 68–78 on live heats; Phase 20.2 reliability ~35 due to POWER recommendation conflicts.

## Acceptance tracking

`POST /feedback` + `recommendation_acceptance.csv` from Phase 33 pipeline.

## Success criteria

- Record ≥5 heats with actual TTT for green validation indicator
- Maintain prediction MAE within Phase 19 test band on new cohort
- Document operator acceptance rate ≥60% for planning recommendations
