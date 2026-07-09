# Phase 24 — Industrial Interpretation

## Validation protocol
- **Temporal split:** first 80% by date for training, last 20% for test (Sjunnesson 2019 recommendation).
- **No EE_KWH / POWER** in any leakage-free feature.
- Dataset A includes OXY/CPC as *assumed* planning setpoints.

## Performance summary (temporal test)

| Model | MAE all heats | MAE TTT<120 | R² all |
|-------|---------------|-------------|--------|
| Leakage-free (A) | 35.97 | 25.98 | -0.137 |
| Production Phase 19 | 14.91 | 3.99 | -0.007 |

**MAE delta (all heats):** +21.06 min  
**MAE delta (normal heats):** +21.99 min

## Interpretation
- Full-test MAE is dominated by **delay/shutdown outliers** (43 heats with TTT>120 min in temporal test).
- On **normal heats (TTT<120)**, leakage-free model is the fair comparison cohort.
- Production model benefits from **HM_X_POWER** and **POWER_PER_TONNE** encoding realized melt duration — invalid at planning time.

## Top SHAP features
                  Feature  Mean_ABS_SHAP
                 DRI_X_HM       8.981916
                CPC_X_DRI       7.459029
             BUCKET_X_CPC       6.782820
              SHIFT_LABEL       6.081740
                 DRI_FRAC       5.740456
CHARGE_DEVIATION_FROM_120       5.710565
       LIME_TO_DOLO_RATIO       5.526758
    VIRGIN_TO_SCRAP_RATIO       5.395538
                    HM_SQ       5.281794
           FLUX_PER_TONNE       4.876691

## Error clusters
            Cluster    N   Mean_TTT   Mean_MAE  Median_MAE   Mean_Bias  Pct_of_test
 Shutdown (>120min)   43 697.032558 618.842402  704.578261 -618.842402     1.684953
Long heats (>60min)  116 304.512069 261.041864   46.761581 -218.719127     4.545455
     High HM (>70t)   36 126.944444 109.019589   31.455964  -52.804893     1.410658
   High OXY (>4000)  464  66.334914  55.365246   23.452497    6.917064    18.181818
High charge (>125t)  527  60.814421  46.725198   21.188868    9.090769    20.650470
            Shift B  824  60.365049  46.329483   16.772143    3.730286    32.288401
    High DRI (>60t) 1048  54.241794  41.241546   18.801711    7.058736    41.065831
   High flux (>12t) 2060  52.833010  37.574463   16.695689    8.871170    80.721003

## Ablation
   Dropped_group       MAE  Delta_MAE
         OXY_CPC 37.674029   1.703237
     Charge_size 36.360317   0.389525
    Interactions 36.228588   0.257796
 None (baseline) 35.970792   0.000000
Burden_fractions 35.819874  -0.150918
           Shift 35.126622  -0.844170
