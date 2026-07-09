# Phase 24 — Feature Engineering Document

## Principles (Phase 23.5 constraints)

1. **No EE_KWH** (`POWER`) or any energy-derived feature.
2. **No `CHARGE_BALANCE_ERROR`** or target encodings.
3. **Dataset A:** includes OXY/CPC branch (assumed planning setpoints — pending JSPL).
4. **Dataset B:** burden + flux + shift only (conservative).
5. All ratios use **zero-fill** when denominator is zero (e.g. no HBI → ratio = 0).

## Feature families

### Burden composition (Kirschen 2011; Memoli 2021)
| Feature | Formula | Expected TTT effect |
|---------|---------|---------------------|
| `HM_FRAC` | HM / T C | Negative with O₂ (Duan 2014) |
| `DRI_FRAC` | DRI / T C | Conditional |
| `SCRAP_FRAC` | Bucket / T C | Nonlinear |
| `SOLID_BURDEN_RATIO` | (DRI+HBI+Bucket) / T C | Positive |
| `LIQUID_TO_SOLID_RATIO` | HM / solid burden | Negative |
| `VIRGIN_BURDEN_RATIO` | (HM+DRI+HBI) / T C | Context-dependent |
| `BURDEN_SHARE_RANGE` | max% − min% burden | Heterogeneity |
| `HM_DOMINANCE`, `DRI_DOMINANCE`, `SCRAP_DOMINANCE` | share vs peers | Mix effects |

### Burden ratios
`HM_TO_DRI_RATIO`, `HM_TO_BUCKET_RATIO`, `DRI_TO_BUCKET_RATIO`, `DRI_TO_HBI_RATIO`, `HM_TO_HBI_RATIO`, `VIRGIN_TO_SCRAP_RATIO`

### Flux / slag (Memoli 2021)
| Feature | Formula |
|---------|---------|
| `FLUX_PER_TONNE` | (LIME+DOLO) / T C |
| `LIME_PER_TONNE`, `DOLO_PER_TONNE` | per tonne |
| `LIME_TO_DOLO_RATIO` | basicity proxy |
| `FLUX_PER_SOLID_BURDEN` | flux / solid burden |
| `DOLO_X_LIME`, `LIME_SQ`, `DOLO_SQ` | nonlinear flux |

### Burden interactions (no energy)
`BUCKET_X_DOLO`, `BUCKET_X_DRI`, `BUCKET_X_HM`, `DRI_X_HM`, `DRI_X_LIME`, `HM_X_LIME`, `DOLO_X_DRI`, `DOLO_X_HM`

### OXY/CPC branch — Dataset A only (VERIFY WITH JSPL)
| Feature | Literature |
|---------|------------|
| `OXYGEN_PER_TONNE` | Duan 2014 |
| `CARBON_PER_TONNE` | Morales 2025 |
| `HM_X_OXY_NORM` | HM×O₂ coordination |
| `BUCKET_X_CPC`, `CPC_X_DRI` | Foamy slag |
| `FLUX_TO_CARBON_RATIO`, `CARBON_TO_OXYGEN_RATIO` | Slag/chemistry balance |

### Charge size
`CHARGE_SIZE_TC`, `CHARGE_DEVIATION_FROM_120`, `RELATIVE_CHARGE_DEVIATION`

### Shift
`SHIFT_LABEL`, `SHIFT_A`, `SHIFT_B`, `SHIFT_C`

## Removed vs Phase 19 (leaky)
- `HM_X_POWER`, `POWER_PER_TONNE`, `CHARGE_BALANCE_ERROR`
- All `*_POWER`, `SPECIFIC_ENERGY`, `POWER_INTENSITY` variants

## Implementation
- `feature_engineering.py` — `build_clean_dataset()`, `engineer_planning_features()`
- `phase_24_pipeline.py` — full model comparison script
- `complete_phase_24.py` — temporal validation + reports
