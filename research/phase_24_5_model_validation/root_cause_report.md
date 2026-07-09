# Root Cause Report

## Ranked causes

| Reason                                                 | Evidence                                                        | Confidence   |   MAE_delta_estimate |
|:-------------------------------------------------------|:----------------------------------------------------------------|:-------------|---------------------:|
| Energy leakage removed (HM_X_POWER, POWER_PER_TONNE)   | Ablation ΔMAE=+0.58 on P16 random split (22→19 feat)            | Likely       |             0.582692 |
| Temporal distribution shift                            | Random→Temporal ΔMAE=+0.89 on LF features                       | Likely       |             0.88845  |
| Training cohort mismatch (P19 TTT≤60 vs P24 all heats) | P16 normal LF random MAE=3.27 vs all-heats random MAE=35.51     | Very likely  |            32.2375   |
| Delay/outlier heats in training                        | 655 heats with TTT>60 in raw excluded from P16                  | Very likely  |           nan        |
| Systematic positive bias (+17 min on normal)           | Error cluster bias from temporal LF model                       | Very likely  |           nan        |
| Feature engineering bug                                | Overlapping features match within 1e-4 on 100-heat sample       | Unlikely     |             0        |
| TTT target changed                                     | Max diff raw vs P24A = 0                                        | Unlikely     |             0        |
| Model underfitting alone                               | Learning curve final val MAE≈37.7                               | Possible     |           nan        |
| OXY/CPC timing uncertainty                             | Dataset A assumes planning; if final totals, extra leakage risk | Possible     |           nan        |
| Missing DRI metallization / power-on time              | Not in any dataset                                              | Very likely  |           nan        |

## Quantified decomposition (approximate)

- **Leakage removal alone** (P16, random): **+0.58 min** MAE
- **Temporal shift alone** (LF, all heats): **+0.89 min** MAE
- **Cohort mismatch** (all heats vs TTT≤60): training mean TTT 56.6 vs P16 41.5

## Final answers

### 1. Genuinely poor or implementation bug?
**Neither a bug nor inherently poor.** On the same normal-heat cohort as Phase 19, leakage-free LightGBM achieves **MAE=3.27** (vs production ablation baseline **3.09**). Phase 24 appears poor because it trains on **all 12,758 heats** including delays; even restricting the temporal test to TTT≤60 yields **MAE=25.25** (Phase 24 reported). TTT target is unchanged; overlapping features match exactly.
### 2. MAE increase from leakage removal alone?
**~0.28–0.58 min** on Phase 16 normal cohort, random split (removing EE_KWH derivatives or all questionable features).
### 3. MAE increase from temporal drift?
**~0.9 min** on all-heats LF model (35.5→36.4). **~4.4 min** on TTT<120 subset (22.1→26.4). Temporal drift is secondary to cohort mismatch.
### 5. Can LF reach MAE < 5 min on current data?
**Yes on normal cohort** (achieved 3.27). **No on full dataset** without separating delay heats — charge features alone cannot predict 600+ min delays.
### 6. Biggest data limitation?
**Missing process-quality variables** (DRI metallization, power-on time, delay codes) and **heterogeneous delay heats** in full dataset.
### 7. Phase 25 focus?
**New industrial variables** + **two-stage normal/delay model** > better models > more data volume.