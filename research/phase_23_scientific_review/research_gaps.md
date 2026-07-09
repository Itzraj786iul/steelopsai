# Phase 23 — Research Gaps: Model vs Literature vs Industrial Practice

**Frozen baseline:** Phase 19 StackingRegressor — MAE **3.06 min**, R² **0.366**, 22 features, 12,758 heats.

This document compares what the production pipeline gets **right**, **wrong**, and **cannot yet assess**, with expected MAE impact ranges for Phase 24 (estimates are hypothesis-level, not validated).

---

## 1. What the Current Model Gets Right

### 1.1 Burden composition over absolute tonnage
- Literature (L3, L4): DRI **share** and HM–DRI balance drive energy and time more than isolated tonnes.
- Model: Uses `HM_TO_DRI_RATIO`, `SOLID_BURDEN_RATIO`, `BURDEN_SHARE_RANGE` rather than raw HM/DRI after VIF reduction.
- **Verdict:** ✓ Aligned.

### 1.2 Oxygen intensity matters
- Literature (L5): O₂ coordination with HM is critical for TTT.
- Model: `OXYGEN_PER_TONNE` is SHAP rank **#3** (1.10).
- **Verdict:** ✓ Aligned.

### 1.3 Carbon–scrap interaction
- Literature (L7): Carbon foaming agents interact with scrap/DRI FeO load.
- Model: `BUCKET_X_CPC` SHAP rank **#2** (1.25).
- **Verdict:** ✓ Aligned.

### 1.4 HM–DRI substitution in optimizer
- Literature (L5): HM and DRI are coupled via process chemistry.
- Optimizer: Opposite-direction HM/DRI move rule; relative penalties.
- **Verdict:** ✓ Aligned.

### 1.5 Power restriction as constraint
- Literature: Transformer limits extend arcing time.
- Optimizer: Blocks POWER increases under restriction.
- **Verdict:** ✓ Aligned (though POWER semantics need fix).

### 1.6 Industrial cleaning discipline
- Phase 13 removed impossible flux/CPC/POWER rows; charge balance checks.
- Literature: Data quality dominates EAF model credibility (L2).
- **Verdict:** ✓ Strong foundation.

---

## 2. What the Current Model Gets Wrong or Risks

### 2.1 ⚠ POWER field mislabeled and misused (HIGH PRIORITY)

| Aspect | Current state | Literature |
|--------|---------------|------------|
| Semantics | Named `POWER`; treated as controllable | Field is **kWh** total electrical energy (L1, L2) |
| Role in model | `HM_X_POWER` (#1 SHAP), `POWER_PER_TONNE` (#5) | kWh is **intermediate/consequence** of duration and efficiency |
| Role in optimizer | In `CONTROLLABLE_NUMERIC`; can be varied ±% | Should not be free decision variable |
| Leakage | End-of-heat kWh partially **encodes** realized TTT | Circular for prospective prediction (L2) |

**Evidence:**
- Mean POWER 33,768 at T C 120.7 t → 280 kWh/t (physically plausible as SEC).
- Raw POWER vs TTT Pearson +0.114 (full data, n=12,758 incl. delay outliers); **+0.478 on normal heats (TTT&lt;120 min, n=12,525)** — correlation strengthens when shutdown-like heats are excluded, consistent with kWh tracking realized melt duration.
- VIF removed raw POWER (564) but retained energy-bearing interactions.

**Impact if unfixed:** Optimizer may recommend "lower kWh" recipes that are **not realizable** without shortening time; model may appear accurate in-sample via leakage while failing prospectively.

**Expected MAE impact of fix:** +0.5 to +2.0 min temporary **increase** when removing leaky features (honest model), then −0.3 to −1.0 min recovery with proper features (planned SEC, restriction flag).

---

### 2.2 ⚠ Single-regime model for delay/outlier heats

| Aspect | Current state | Literature |
|--------|---------------|------------|
| Data | 299 heats with shutdown-like TTT retained | Delays are distinct sub-process (L1, L10) |
| Model | One StackingRegressor on all heats | Recommends mixture or two-stage models |
| R² | 0.366 — variance dominated by irreducible ops noise | Expected for heterogeneous regimes |

**Expected MAE impact of two-stage model:** −0.4 to −1.2 min on **normal** heats (TTT < 90 min); large improvement on delay classification, not necessarily regression MAE alone.

---

### 2.3 ✗ Missing DRI quality variables

| Missing variable | Literature importance | In JSPL data |
|------------------|----------------------|--------------|
| Metallization % | Optimum 94–96% (L3) | **No** |
| Gangue / SiO₂ | Slag volume, kWh/t (L3, L4) | **No** |
| DRI temperature | Hot vs cold charging (TERI, L3) | **No** |
| DRI feed rate | kg/min·MW (L3) | **No** |

**Industrial claim** ("metallization improves arc stability") **cannot be tested** on current dataset.

**Expected MAE impact if metallization added:** −0.2 to −0.8 min (based on CJCE 2025 arcing study sensitivity and Hein 2025 physics features).

---

### 2.4 ? DRI tonnage sign confusion

| Source | DRI effect |
|--------|------------|
| Literature (DRI-heavy plants) | More DRI → longer TTT (L4) |
| JSPL raw DRI vs TTT | +0.006 (null) |
| JSPL DRI_PCT_TC | −0.24 |
| Industrial experts | Higher metallization may reduce TTT |

**Interpretation:** JSPL operates **HM + DRI hybrid**, not 80–95% DRI plants in Memoli (2021). Confounding: when DRI↑, HM often↓ (optimizer enforces negative correlation). Apparent negative DRI_PCT effect may encode **HM substitution**, not DRI physics.

**Gap:** Need metallization and HM–DRI **joint** features to resolve.

---

### 2.5 ? DOLO_SQ high SHAP (rank #6)

- Literature: Doloma effect is indirect (MgO, viscosity).
- Model: `DOLO_SQ` SHAP 0.23 — surprisingly above `HM_TO_DRI_RATIO`.
- Possible explanations: (a) captures narrow optimal MgO band; (b) collinearity artifact with flux practice; (c) proxy for DRI-heavy slag regime.

**Gap:** Requires partial dependence / causal review in Phase 24 — not literature-validated as primary TTT driver.

---

### 2.6 ✗ CHARGE_BALANCE_ERROR retained

- SHAP ≈ 0; Pearson ≈ 0.
- Phase 13: imputation logic uses charge closure — feature may encode data QC not process physics.
- **Recommendation:** Exclude from model; keep in data pipeline only.

---

### 2.7 Optimizer physics penalties vs literature direction

| Penalty | Optimizer behavior | Literature |
|---------|-------------------|------------|
| POWER decrease | Penalized unless large TTT improvement | kWh reduction is **desired outcome**, not something to penalize when achieved via better chemistry |
| OXY decrease | Penalized | O₂ reduction OK if decarb complete — context-dependent |
| HM/DRI same direction | Rejected | ✓ |

**Gap:** Penalties conflate **recipe variables** with **outcome variables** for POWER.

---

## 3. Agreement Matrix (Summary)

| Variable / Feature | Literature | Feature imp. | SHAP | Correlation | Optimizer | Industrial | Overall |
|-------------------|------------|--------------|------|-------------|-----------|------------|---------|
| HM | Conditional ↓ TTT | Low raw | Via interactions | ~0 | Coupled ✓ | High use | Partial ✓ |
| DRI | Conditional | Low raw | Via ratios | ~0 | Coupled ✓ | Quality matters | ? |
| Metallization | 94–96% optimum | N/A | N/A | N/A | N/A | Stability ↑ | **Unknown** |
| Bucket | Nonlinear | Moderate | Via CPC | +0.03 | Penalize ↑ | Moderate | ✓ |
| POWER (kWh) | Consequence | Removed raw | High derived | +0.11 | Controllable ✗ | **Is kWh** | **⚠ Misinterpret** |
| OXY | Nonlinear ↓ | High per-t | 1.10 | +0.06 | Penalized ↓ | Key lever | ✓ |
| CPC | Foam ↓ | Interaction | 1.25 via Bucket | +0.07 | Bounded | Key lever | ✓ |
| Lime/Dolo | Slag volume | Low | DOLO_SQ high | ~0 | Bounded | Standard | Partial |
| Foamy slag | ↓ TTT | N/A | Proxied | N/A | Indirect | Important | **Unknown** |
| Delays | ↑↑ TTT | Outliers | N/A | N/A | N/A | 299 flagged | ✗ Regime mix |
| Shift | Weak | Low | <0.02 | ~0 | N/A | Minor | ✓ |
| Power restriction | ↑ TTT | N/A | N/A | N/A | Hard ✓ | Real | ✓ (flag needed in model) |

---

## 4. Potential Data Leakage Paths

| Path | Mechanism | Severity |
|------|-----------|----------|
| POWER → TTT | kWh accumulated over realized duration | **High** |
| HM_X_POWER → TTT | Product of HM with end-of-heat energy | **High** |
| POWER_PER_TONNE → TTT | SEC encodes time + efficiency | **Medium–High** |
| OXY → TTT | O₂ partly adjusted during heat based on progress | **Medium** (less than kWh) |
| T C → features | Charge known at start | Low |
| CHARGE_BALANCE_ERROR | Artifacts from imputation | Low (noise) |

**Note:** OXY may also be updated mid-heat; literature still treats **planned oxygen intensity** as legitimate input (L5). kWh is more severely endogenous.

---

## 5. Potential Misinterpretations in Current Pipeline

1. **"POWER" name implies kW** — operators and future developers may set physically impossible values in what-if scenarios.
2. **`HM_X_POWER` labeled "interaction"** — functions as HM × (energy outcome), not HM × (power setpoint).
3. **Optimizer varies kWh** — implies plant can choose total kWh independent of physics; should vary burden/chemistry instead.
4. **DRI tonnage alone** — experts discuss metallization; model has no quality dimension.
5. **High R² features may be leaky** — explains why `#1` SHAP is energy-based while raw HM/DRI correlations are near zero.

---

## 6. R² = 0.366 — Is This Failure?

**Literature context:**
- Hein et al. (2025): SEC model R² 0.41 with physics features on similar DRI/scrap plant.
- CJCE (2025): Arcing time R² 0.89 — but **narrower target**, different plant, 22 inputs.
- Sjunnesson (2019): Many published EE models never validated on future heats.

**JSPL assessment:** R² ≈ 0.37 is **plausible** for aggregate TTT with missing metallization, delays, and sub-process times. Improvement headroom exists primarily through:
1. Leakage removal (honesty)
2. Regime separation
3. DRI quality features
4. Sub-process decomposition

---

## 7. Expected MAE Improvement Potential (Phase 24 Hypotheses)

| Initiative | MAE delta (min) | Confidence | Rationale |
|------------|-----------------|------------|-----------|
| Remove leaky energy features | +0.5 to +2.0 then recover | High | Temporary hit from honesty |
| Add power_restriction + delay flags | −0.2 to −0.6 | Medium | Constraint/regime signal |
| Add DRI metallization | −0.2 to −0.8 | Medium | Expert + L3 mechanism |
| Two-stage normal/delay model | −0.4 to −1.2 (normal heats) | Medium | 299 outliers |
| Replace HM_X_POWER with HM×O₂ interaction | −0.1 to −0.4 | Medium | Duan (2014) mechanism |
| Physics SEC prior feature (planned kWh/t) | −0.2 to −0.5 | Low–Medium | Hein (2025) approach |
| Sub-process time logging | −0.5 to −1.5 | Low | Requires new data collection |

**Combined realistic target after Phase 24:** MAE **2.3–2.8 min** on normal heats (from 3.06), R² **0.42–0.50** — contingent on metallization data availability.

---

## 8. Data Collection Gaps (Non-Model)

| Variable | Source | Priority |
|----------|--------|----------|
| DRI metallization % | Shaft lab / L2 | **Critical** |
| DRI delivery temperature | Thermography / log | High |
| Power-on vs power-off minutes | Level-2 SCADA | High |
| Delay reason codes | MES | High |
| Foamy slag events / FeO | Slag lab + models | Medium |
| Transformer MW setpoint | SCADA | Medium |
| Tap weight / yield | Production log | Medium |

---

*Phase 23 — research only. No retraining performed.*
