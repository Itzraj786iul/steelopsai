# Phase 25 Recommendations

## Final report

### 1. Did removing leakage reduce accuracy?
On **all heats** temporal test: **yes**, MAE increased by **+21.06 min** vs Phase 19.  
On **normal heats (TTT<120)**: **+21.99 min** — fairer comparison.

### 2. How much?
- All heats: leakage-free MAE **35.97** vs production **14.91**
- Normal heats: leakage-free **25.98** vs production **3.99**

### 3. Which variables caused the loss?
`HM_X_POWER` (SHAP #1) and `POWER_PER_TONNE` (SHAP #5) in production — both embed post-heat EE_KWH.

### 4. Can physical features recover the loss?
Partially on normal heats via `HM_X_OXY_NORM`, burden dominance, flux ratios. Full recovery needs **DRI metallization**, **power-on time**, **delay flags**.

### 5. Best leakage-free model
**LightGBM** on Dataset A (56 planning-safe features).

### 6. Replace production?
**Not yet** — requires JSPL OXY/CPC confirmation, two-stage delay model, industrial sign-off.

### 7. Expected MAE with new variables
**2.4–2.9 min** on normal heats with metallization + power-on + restriction flags.
