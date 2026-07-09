# Phase 24.5 Validation Summary

## Executive conclusion

The Phase 24 MAE collapse (3.06 → 25–36 min) is **not caused by a pipeline bug** and **not primarily caused by leakage removal**. Controlled experiments show:

| Isolated factor | Protocol | MAE | Δ vs baseline |
|-----------------|----------|-----|---------------|
| Production (22 leaky features) | P16 normal, random split | **3.09** | — |
| Leakage-free (56 features) | P16 normal, random split | **3.27** | +0.18 |
| Remove all leaky/questionable (14 safe) | P16 normal, random split | **3.67** | +0.58 |
| Leakage-free | All 12,758 heats, random split | **35.51** | +32.2 |
| Leakage-free | All heats, temporal split | **36.40** | +0.89 vs random |
| Leakage-free (Phase 24 protocol) | Temporal, test TTT≤60 only | **25.25** | — |
| Production (Phase 24 eval) | Temporal, test TTT≤60 only | **3.31** | — |

**Primary root cause: training cohort mismatch** — Phase 19 trains on 12,103 normal heats (TTT≤60); Phase 24 trains on all 12,758 heats including 655 delay/shutdown events (TTT up to 1,439 min). Charge-recipe features cannot distinguish normal vs delay heats with similar inputs.

---

## Step-by-step findings

### 1. Dataset consistency
- **Phase 13 raw = Phase 24 A** (12,758 rows, identical TTT)
- **Phase 16 normal** = 12,103 rows (655 heats removed, TTT capped at 60)
- TTT target unchanged (max diff = 0.0)

### 2. TTT validation
- Raw/P24 mean TTT = 56.6 min vs P16 mean = 41.5 min
- 655 heats with TTT>60 in full dataset (5.1% of rows, extreme variance)

### 3. Feature engineering
- All 22 overlapping production features match exactly on 100-heat sample (max diff = 0)
- Phase 24 adds 34 new planning-safe features; no formula bugs detected

### 4. Temporal drift
- TTT PSI (train vs test) = 0.026 (low)
- Top shifted features: LIME_PER_TONNE (PSI=0.58), FLUX_PER_TONNE (PSI=0.46) — moderate operational drift
- Temporal split adds only **+0.89 min** MAE on all-heats LF model

### 5. Random vs temporal (leakage-free)
- All heats: random 35.51 → temporal 36.40 (+0.89)
- TTT<120 subset: random 22.07 → temporal 26.43 (+4.36)
- P16 normal cohort random: **3.27** (apples-to-apples with Phase 19)

### 6. Leakage ablation (P16, random split, LightGBM)
| Experiment | MAE | Δ |
|------------|-----|---|
| Full 22 leaky | 3.09 | — |
| No EE_KWH derivatives | 3.37 | +0.28 |
| No HM_X_POWER | 3.23 | +0.14 |
| No POWER_PER_TONNE | 3.11 | +0.02 |
| No all energy-derived | 3.39 | +0.30 |
| No OXY | 3.32 | +0.23 |
| No CPC | 3.11 | +0.02 |
| Safe 14 only | 3.67 | +0.58 |

SHAP shifts from HM_X_POWER → CPC_X_DRI / FLUX_TO_CARBON_RATIO when energy features removed.

### 7. Model capacity (all heats, random split)
- LightGBM: 35.51 | CatBoost: 29.97 | XGBoost: 35.58
- Better models help marginally; cannot fix population heterogeneity

### 8. Learning curves
- Train MAE ≈ 23 min at full data; CV val MAE ≈ 38 min
- Large train–val gap driven by delay heats, not pure underfitting

### 9. Error clusters (temporal LF, all-heats training)
- TTT>120: MAE 618 min (model predicts ~60, actual ~697)
- TTT>60: MAE 264 min
- High flux: +9.5 min bias; Shift C: +15.4 min bias

---

## Answers to final questions

1. **Genuinely poor or bug?** No implementation bug. Model is poor **only when trained on mixed normal+delay population**. On P16 normal cohort, LF MAE = 3.27.
2. **Leakage removal alone?** **~0.3–0.6 min** (ablation on fair protocol).
3. **Temporal drift alone?** **~0.9 min** (all heats); **~4.4 min** on TTT<120 subset.
4. **Feature engineering correct?** **Yes** for overlapping features; Phase 24 extensions validated.
5. **MAE < 5 min feasible?** **Yes on normal cohort** (3.27 achieved). **No on full heterogeneous dataset** without delay modeling.
6. **Biggest data limitation?** **Unlabeled delay events** in training data + missing process variables (metallization, power-on time).
7. **Phase 25 focus?** **Two-stage model** (normal vs delay) + **new industrial variables** > more data volume > better algorithms.

---

## Deliverables

All outputs in `research/phase_24_5_model_validation/`:

- `dataset_comparison.xlsx`
- `ttt_validation_report.md`
- `feature_pipeline_validation.csv`
- `distribution_shift_report.xlsx`
- `population_stability.csv`
- `ks_statistics.csv`
- `random_vs_temporal.csv`
- `ablation_results.csv`
- `ablation_shap_top5.csv`
- `model_capacity.csv`
- `learning_curves.csv`
- `error_clusters.csv`
- `root_cause_report.md`
- `plots/` (5 figures)
