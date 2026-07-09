# Phase 23.5 — Temporal Leakage Report

**Audit date:** Phase 23.5  
**Frozen artifacts:** Phase 19 model, Phase 20.2 optimizer, Phase 22.5 platform  
**Industrial confirmation:** `POWER` = **EE_KWH** (total electrical energy, kWh), recorded **only after heat completion**

---

## Executive Summary

The production TTT model (MAE 3.06 min, R² 0.366) was trained on **retrospective heat records** where post-process variables were joined to the same-heat target. JSPL has now confirmed that **EE_KWH is not available before prediction**. Two production features — **`HM_X_POWER` (SHAP rank #1)** and **`POWER_PER_TONNE` (SHAP rank #5)** — directly embed this post-process variable. This constitutes **high-severity temporal leakage** for prospective (planning-time) use.

Additionally, **six production features** depend on **OXY** and/or **CPC** whose measurement timing is **not documented** in the pipeline. These are flagged **REQUIRES INDUSTRIAL CONFIRMATION**.

**No model retraining or feature removal was performed in this phase.**

---

## Leakage Severity Ranking

| Rank | Source | Severity | Production impact | Features affected |
|------|--------|----------|-------------------|-------------------|
| 1 | EE_KWH used at training time for same-heat TTT | **CRITICAL** | Inflated accuracy; wrong causal direction for planning | `POWER`, `POWER_PER_TONNE`, `HM_X_POWER` + 8 Phase 16 energy features |
| 2 | Train–serve skew on EE_KWH | **HIGH** | Training uses actual end-of-heat kWh; UI uses operator-entered/historical values | All energy-derived features |
| 3 | OXY/CPC may be final totals not setpoints | **HIGH (if confirmed final)** | Same retrospective pattern as EE_KWH | `OXYGEN_PER_TONNE`, `BUCKET_X_CPC`, `CPC_X_DRI`, `FLUX_TO_CARBON_RATIO`, `CPC_X_HBI` |
| 4 | Optimizer varies EE_KWH as recipe input | **HIGH (decision logic)** | Recommends non-physical "recipes" | Phase 20.2 `CONTROLLABLE_NUMERIC` |
| 5 | Single-regime model with delay outliers | **MEDIUM** | Heterogeneous TTT process in one model | All features (299 shutdown-like heats) |
| 6 | `CHARGE_BALANCE_ERROR` from imputation | **LOW** | Noise / QC artifact | 1 production feature |
| 7 | `SHIFT_TARGET_ENCODED_ANALYSIS` (Phase 16 only) | **CRITICAL if used** | Target encoding leakage | Not in production (correctly excluded) |

---

## 1. EE_KWH — Complete Audit

### 1.1 Variable identity

| Attribute | Value |
|-----------|-------|
| Dataset field | `POWER` |
| Correct name | `EE_KWH` |
| Physical meaning | Total electrical energy consumed in the heat |
| Unit | kWh (mean ≈ 33,768 kWh/heat; ≈ 280 kWh/t at 120 t charge) |
| Measured when | **After tapping / post-process** (JSPL confirmed) |
| Availability | **Post-process** — NOT planning, NOT operator input at prediction time |
| Classification | **Outcome** (also intermediate in energy balance) |

### 1.2 Why EE_KWH is an outcome, not a planning variable

**Temporal logic:**
- At recipe lock-in (before charging), the operator knows burden (HM, DRI, scrap), planned flux, and may have **targets** for O₂/C.
- EE_KWH is the **integral of arc power over the realized heat duration**, affected by:
  - Actual power-on time (component of TTT)
  - Arc transfer efficiency (foamy slag, electrode position)
  - Power restrictions during the heat
  - Delays and re-starts
  - Actual vs planned chemistry path

**Literature (Phase 23):**
- Knutsen et al. (2020): TTT sub-stages and delays drive nonlinear heat losses → EE demand.
- Sjunnesson et al. (2019): Power-on time and EE are strongly correlated; warns against using realized time/energy as inputs without causal framing.
- Hein et al. (2025): Fitted SEC model coefficient on TTT of +0.37 kWh/t·min — **time drives energy**, not independent recipe choice.

**Causal mechanism (not merely correlational):**

```
Longer TTT → longer power-on (and idle hot bath) → higher ∫P(t)dt = higher EE_KWH
```

Reverse path also exists (poor arc efficiency → more kWh per minute), but **both paths unfold during the same heat**. Using final EE_KWH to predict TTT for that heat observes the **outcome of the process being predicted**.

### 1.3 Empirical evidence (JSPL data)

| Statistic | Value | Interpretation |
|-----------|-------|----------------|
| Pearson(EE_KWH, TTT) all heats | +0.11 | Moderate positive |
| Pearson(EE_KWH, TTT) TTT < 120 min | **+0.48** | Stronger when delay outliers removed |
| HM_X_POWER SHAP | **1.54 (#1)** | Model heavily uses energy-bearing feature |
| POWER_PER_TONNE SHAP | 0.49 (#5) | SEC encodes duration |

The strengthening of correlation on normal heats is consistent with **energy tracking melt duration** rather than a pure recipe effect.

### 1.4 Derived features containing EE_KWH

| Feature | Formula | Leakage | In production? | Recommendation |
|---------|---------|---------|----------------|----------------|
| `POWER` / `EE_KWH` | — | **High** | Raw (removed by VIF; used in FE) | **REMOVE** |
| `POWER_PER_TONNE` | EE_KWH / T C | **High** | **Yes** | **REMOVE** |
| `HM_X_POWER` | HM × EE_KWH | **High** | **Yes** | **REMOVE** |
| `POWER_PER_METALLIC_TONNE` | EE_KWH / metallic | **High** | Phase 16 pool | **REMOVE** |
| `SPECIFIC_ENERGY` | alias | **High** | Phase 16 alias | **REMOVE** |
| `POWER_SQ` | EE_KWH² | **High** | Phase 16 pool | **REMOVE** |
| `POWER_TO_OXYGEN_RATIO` | EE_KWH / OXY | **High** | Phase 16 (VIF removed) | **REMOVE** |
| `OXY_X_POWER` | OXY × EE_KWH | **High** | Phase 16 (VIF removed) | **REMOVE** |
| `DRI_X_POWER`, `BUCKET_X_POWER`, `LIME_X_POWER`, etc. | burden × EE_KWH | **High** | Phase 16 interactions | **REMOVE** |
| `POWER_INTENSITY` | EE_KWH / metallic | **High** | Phase 16 | **REMOVE** |

**Note on `ENERGY_PER_TONNE`:** Phase 16 uses `POWER_PER_TONNE` and alias `SPECIFIC_ENERGY` — same leakage class. No separate `ENERGY_PER_TONNE` column exists.

### 1.5 Why removal is recommended (and what is NOT lost)

Removing leaky features does **not** deny metallurgical truth — it enforces **correct timing**:
- HM, DRI, scrap, flux, and (if verified) planned O₂/C **cause** process duration.
- EE_KWH **records** what happened after the fact.
- Replacing `HM_X_POWER` with **`HM_X_OXY_NORM`** (Phase 23 recommendation) preserves the HM×intensity interaction with a potentially planning-available input.

### 1.6 Train–serve skew (additional leakage class)

| Phase | EE_KWH source |
|-------|---------------|
| Training (Phase 19) | Actual end-of-heat value per record |
| Production UI | Operator-entered field (often historical median or last heat) |

The model learned mappings from **actual** realized energy to TTT. Deployment feeds **different** energy information. This is **not** a pure leakage issue but **distribution shift** that can mask poor planning-time performance.

---

## 2. OXY — Second Audit

### 2.1 What we know

| Attribute | Assessment |
|-----------|------------|
| Dataset field | `OXY` |
| Typical magnitude | ~3,000–4,500 plant units per heat (from sample rows) |
| Pipeline documentation | **None** on setpoint vs total vs running accumulation |
| Used in production | Raw (VIF removed); `OXYGEN_PER_TONNE` (#3 SHAP) |

### 2.2 Hypotheses (not assumed)

| Hypothesis | If true | Leakage | Planning use |
|------------|---------|---------|----------------|
| **A: Planned O₂ budget** before heat | Setpoint / target | None | **Valid** for List A |
| **B: Final heat total** after tap | Post-process total | **High** | **Invalid** for List A |
| **C: Running total** updated during heat | Online cumulative | Medium | **List B only** |

### 2.3 Metallurgical context

- Duan et al. (2014): O₂ must increase with HM ratio to hold TTT — legitimate **planned** intensity variable.
- If operators **increase O₂ during** a slow heat to catch up on decarb, final O₂ total **encodes** realized TTT path → leakage.

### 2.4 Affected features

| Feature | Depends on OXY | Status |
|---------|----------------|--------|
| `OXYGEN_PER_TONNE` | Yes | **VERIFY WITH JSPL** |
| `BUCKET_X_CPC` | No (CPC only) | CPC timing |
| `OXY_X_POWER` | Yes + EE_KWH | **LEAKY** (not in production) |
| All `*_X_OXY` Phase 16 | Yes | **VERIFY WITH JSPL** |

**Audit conclusion:** **REQUIRES INDUSTRIAL CONFIRMATION** before classifying as SAFE or LEAKY.

---

## 3. CPC — Second Audit

### 3.1 What we know

| Attribute | Assessment |
|-----------|------------|
| Dataset field | `CPC` |
| Typical magnitude | ~500–800 kg per heat (sample) |
| Pipeline documentation | **None** on injection schedule vs total charged carbon |
| Used in production | `BUCKET_X_CPC` (#2 SHAP), `CPC_X_DRI`, `FLUX_TO_CARBON_RATIO`, `CPC_X_HBI` |

### 3.2 Hypotheses (not assumed)

| Hypothesis | If true | Leakage | Planning use |
|------------|---------|---------|----------------|
| **A: Planned carbon charge** with recipe | Pre-heat commitment | None | **Valid** |
| **B: Total injected/charged by tap** | Post-process | **High** | **Invalid** for List A |
| **C: Foam-agent additions during melt** | Responsive to slag state | **High** | Online only |

### 3.3 Metallurgical context

- Morales et al. (2025): Carbon drives foamy slag with DRI FeO — interaction `CPC_X_DRI` is physically meaningful **if CPC is planned**.
- If extra carbon is added **because** the heat is running long (slag not foaming), CPC total **encodes** TTT.

**Audit conclusion:** **REQUIRES INDUSTRIAL CONFIRMATION.**

---

## 4. Non-Leakage Issues (Lower Severity)

### 4.1 `CHARGE_BALANCE_ERROR`
- Derived from imputation closure (Phase 13), not a process variable.
- SHAP ≈ 0. No temporal leakage; **remove for parsimony**.

### 4.2 Shift features
- Known before heat. Low predictive value; no leakage.

### 4.3 Delay / shutdown heats
- Not feature leakage but **regime mixing** — 299 heats with extreme TTT retained.
- Model may learn noise; recommend two-stage architecture in Phase 24.

---

## 5. Optimizer Leakage (Logic Audit)

Phase 20.2 includes `POWER` in `CONTROLLABLE_NUMERIC` and applies:
- Relative change windows on POWER
- Physics penalty on POWER **decrease**
- Hard block on POWER increase under restriction

**Problem:** Optimizer searches over EE_KWH values as if operators choose total kWh before the heat. Under JSPL semantics, this is **causally invalid** for planning optimization (distinct from model feature leakage, but same variable misclassification).

---

## 6. Final Action Table — All Production Features (22)

| Feature | KEEP | REMOVE | VERIFY WITH JSPL | UNKNOWN |
|---------|------|--------|------------------|---------|
| HM_X_POWER | | **✓** | | |
| POWER_PER_TONNE | | **✓** | | |
| BUCKET_X_CPC | | | **✓** | |
| OXYGEN_PER_TONNE | | | **✓** | |
| CPC_X_DRI | | | **✓** | |
| FLUX_TO_CARBON_RATIO | | | **✓** | |
| CPC_X_HBI | | | **✓** | |
| SOLID_BURDEN_RATIO | **✓** | | | |
| HM_TO_DRI_RATIO | **✓** | | | |
| BURDEN_SHARE_RANGE | **✓** | | | |
| HM_TO_BUCKET_RATIO | **✓** | | | |
| BUCKET_X_DOLO | **✓** | | | |
| FLUX_PER_TONNE | **✓** | | | |
| DOLO_X_LIME | **✓** | | | |
| DOLO_SQ | **✓** | | | |
| DRI_TO_HBI_RATIO | **✓** | | | |
| BUCKET_X_HBI | **✓** | | | |
| DOLO_X_HBI | **✓** | | | |
| HBI_SQ | **✓** | | | |
| SHIFT_LABEL | **✓** | | | |
| SHIFT_C | **✓** | | | |
| CHARGE_BALANCE_ERROR | | **✓** | | |

**Totals:** KEEP 14 | REMOVE 3 | VERIFY 5 | UNKNOWN 0

---

## 7. Raw / System Variables

| Variable | KEEP | REMOVE | VERIFY | UNKNOWN |
|----------|------|--------|--------|---------|
| HM, DRI, HBI, Bucket | **✓** | | | |
| LIME, DOLO | **✓** | | | |
| Shift, T C | **✓** | | | |
| Power Restriction | **✓** | | | |
| EE_KWH (POWER) | | **✓** | | |
| OXY | | | **✓** | |
| CPC | | | **✓** | |
| TTT (as input) | | **✓** | | |

---

*Phase 23.5 — audit only. See `phase_24_action_plan.md` for recommended next steps.*
