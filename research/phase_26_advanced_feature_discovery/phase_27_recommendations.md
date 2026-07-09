# Phase 27 Recommendations

## Answers to Phase 26 final questions

### 1. How many new physically meaningful variables were discovered?
**35** candidates with metallurgical formulas; **5** gold-tier newly discovered (+ legacy gold) features retained after robustness filters
(exact gold-new count in `gold_features.csv`).

### 2. Which new feature contributed the most?
**LOG_OXYGEN** — robustness 0.987, SHAP 1.1314
(Log oxygen intensity).

### 3. Did MAE improve?
Random-split ΔMAE vs Phase 25 = **+0.040 min** (P26 best = 3.243 vs P25 3.283).
Small gain — confirms information-content bottleneck.

### 4. Can any existing variables be removed?
Weak Phase-24 base features by robustness: BURDEN_SHARE_RANGE, BUCKET_X_DOLO, VIRGIN_BURDEN_RATIO, DRI_FRAC, DOLO_X_HM, RELATIVE_CHARGE_DEVIATION, DOLO_PER_TONNE, DRI_DOMINANCE.
Prefer pruning after multicollinearity VIF with gold set; do not drop O₂/CPC coordination features without MES confirmation of timing.

### 5. Are multiple operating regimes present?
**Yes.** Silhouette-optimal KMeans **k=2**; rule-based High_HM / High_DRI / High_Scrap / Low_Oxygen / Flux_intensive show distinct TTT means (`operating_regimes.csv`).

### 6. Should multiple specialized models replace one global model?
**Partially.** Keep global normal-heat model; add **regime-aware** modules only for:
- High-scrap practice
- Oversize charge (>130 t)
- Phase 25 abnormal/delay path
Do **not** fragment into many weak cluster models without more samples/events.

### 7. Which variables should JSPL record immediately?
1. Delay codes + timestamps
2. Power-on / power-off minutes
3. DRI metallization %
4. Charging / crane wait times
5. Power restriction flag
(Phase 25 industrial priority — Phase 26 cannot invent these from existing columns.)

## Phase 27 focus
- **Data acquisition** (MES/SCADA variables), not further algorithmic remixing of HM/DRI/O₂
- Shadow-deploy Phase 25 two-stage + Phase 26 gold feature set
- Joint gold-feature VIF reduction and operator-facing recipe KPIs (entropy, foam proxy, flux saturation)
