# User Manual — JSPL EAF Decision Support v3.0

## Prediction

1. Enter heat recipe on **Prediction**.
2. Click **Predict TTT**.
3. Review **Phase 32 Trust Framework**: Reliability Index, consensus, and tooltips.
4. Use SHAP interpretations and similar heats for context.

## Recipe Optimizer

1. Choose **Production (20.2)**, **Research (V2)**, or **Compare Both**.
2. Run optimizer.
3. Read the **explanation chain** (burden balance → arc efficiency → expected saving).
4. Compare **top 5 alternatives** before applying changes.
5. V2 mode never changes electrical energy setpoint.

## Plant Validation

Record heat number, predicted vs actual TTT, optimizer used, and whether recommendation was applied. MAE/RMSE update automatically.

## Operator Feedback

Mark recommendations Accepted / Modified / Rejected with optional constraint notes. Data is for research only — models are not retrained.

## Reliability Dashboard

Aggregates average trust metrics from Phase 32 A/B evaluation and validation history.

## Deployment Readiness

Traffic-light view for thesis defense and JSPL demonstration.
