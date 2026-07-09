# Phase 25 Model Selection

## Stage 1 — Regime classifier

**Selected schema:** `2class_normal_vs_abnormal` (TTT ≤60 vs >60)  
**Selected model for Macro-F1:** `LightGBM`  
**Selected model for delay recall:** `BalancedRandomForest`

### Regime counts (full dataset, n=12,758)

| Regime | Count | Share |
|--------|------:|------:|
| NORMAL (≤60) | 12,103 | 94.9% |
| LONG (60–120) | 423 | 3.3% |
| DELAY (120–180) | 44 | 0.3% |
| SHUTDOWN (>180) | 188 | 1.5% |
| ABNORMAL (>60) | 655 | 5.1% |

### Classifier performance (temporal test)

| Model | Schema | Accuracy | Macro F1 | Abnormal Recall | Abnormal Precision |
|-------|--------|----------|----------|-----------------|--------------------|
| LightGBM | NORMAL vs ABNORMAL | 0.941 | **0.613** | 0.224 | 0.299 |
| BalancedRF | NORMAL vs ABNORMAL | 0.855 | 0.567 | **0.431** | 0.142 |
| CatBoost | ≤120 vs >120 | **0.981** | 0.515 | 0.023 | 0.125 |

**Industrial conclusion:** Charge-recipe features alone **cannot reliably separate** delay heats. Best Macro-F1 is LightGBM binary; best recall trades precision (high false alarms with BalancedRF). Four-class schemas collapse on LONG/DELAY/SHUTDOWN minority classes.

Top delay predictors (LightGBM SHAP): charge size deviation, scrap–CPC interactions, O₂/HM intensity — weak absolute SHAP magnitudes, consistent with mostly exogenous delays.

## Stage 2 — Normal heat regression (leakage-free)

| Model | Split | MAE | RMSE | R² |
|-------|-------|-----|------|-----|
| **CatBoost** | Temporal | **3.640** | 4.828 | 0.223 |
| LightGBM_tuned | Temporal | 3.663 | 4.851 | 0.215 |
| Voting | Temporal | 3.690 | 4.867 | 0.210 |
| LightGBM | Random | **3.283** | 4.562 | 0.267 |

## Stage 3 — Long heats (60 < TTT ≤ 180)

| Model | Temporal MAE |
|-------|-------------:|
| Dedicated LightGBM | **18.55** |
| Normal model on long | 33.05 |

Dedicated long-heat model improves MAE by **14.5 min** vs applying the normal model.

## Stage 4 — Shutdown (TTT > 180)

| Model | Temporal MAE |
|-------|-------------:|
| LightGBM shutdown | 248 |
| Median baseline | 557 |

Shutdown regression is **not reliable**. Use **classification + alert only**.

## Pipeline simulation (temporal test, n=2,552)

| Metric | Value |
|--------|------:|
| Two-stage overall MAE | **16.04 min** |
| Single-model MAE (mixed) | 36.43 min |
| Improvement | **−20.39 min** |
| Normal-subset MAE (pipeline) | 4.64 min |
| Delay warning recall | 22.4% |
| False alarm rate | 2.5% |
| Missed delays | 77.6% |

## Architecture

```
Recipe → Stage 1 classifier
           ├─ NORMAL  → Stage 2 leakage-free TTT regression
           └─ ABNORMAL → Delay WARNING (no duration for >180)
                         optional LONG duration model (60–180)
```
