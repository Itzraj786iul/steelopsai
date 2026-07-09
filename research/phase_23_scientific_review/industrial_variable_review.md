# Phase 23 — Industrial Variable Review

**Project:** JSPL EAF Tap-to-Tap Time (TTT) ML Platform  
**Phase:** 23 — Scientific investigation (no code/model changes)  
**Dataset:** `research/phase_13_industrial_cleaning/final_model_dataset.csv` (12,758 heats)  
**Frozen model:** 22 features, StackingRegressor, MAE ≈ 3.06 min, R² ≈ 0.366

---

## Executive Summary

### Critical finding: `POWER` is electrical energy (kWh), not electrical power (kW)

JSPL industrial clarification aligns with data magnitudes:
- Mean `POWER` ≈ **33,768 kWh/heat** at mean charge ≈ **120.7 t** → **~280 kWh/t**, within literature SEC bands (340–680 kWh/t depending on DRI share; Kirschen 2011; Memoli 2021).
- If interpreted as kW, values would be physically impossible for a single heat.

**Literature classification (L1, L2, L3, L11):**
| Role | Evidence |
|------|----------|
| **Intermediate / accumulated process variable** | Total kWh integrates arc transfer efficiency, power-on duration, foamy slag state, and heat losses. |
| **Partial consequence of long TTT** | Radiation and cooling-water losses scale with time; Knutsen (2020) and Hein (2025) treat TTT as predictor of SEC. |
| **Semi-controllable setpoint** | Operators influence kWh via transformer tapper, foamy slag, and chemical energy — but **final kWh is not known at recipe lock-in**. |

**Recommendation:** Do **not** treat end-of-heat total kWh as a freely optimizable recipe lever. Use for **retrospective prediction** only with leakage controls; prefer **normalized burden features + power restriction flag** for prospective use.

### DRI metallization: expert claim vs literature

Industrial experts: *higher metallization improves arc stability and may reduce TTT.*

**Literature verdict: conditional, not monotonic (L3, L4, L13):**
- **Low metallization** → more FeO reduction in EAF (endothermic, ~800 kWh/t FeO) → longer melting, more O₂/C.
- **Very high metallization** → less CO generation → less bath agitation and foamy slag → worse arc coupling → can **increase** energy and time.
- **Optimum band ~94–96%** metallization (Kirschen et al. 2011).
- **Higher DRI tonnage share** (without quality/temperature context) is associated with **longer** TTT in multi-plant surveys (Memoli 2021: 60–100 min vs 50–60 min scrap).

**JSPL data:** Raw `DRI` tonnage Pearson vs TTT ≈ **+0.006** (negligible). `DRI_PCT_TC` correlation ≈ **−0.24** in feature pool — burden **composition** matters more than absolute tonnes. **Metallization is not in the dataset** — cannot validate expert hypothesis empirically in Phase 23.

---

## Cross-Reference Framework

For each variable below:

| Column | Source |
|--------|--------|
| Literature | Phase 23 literature review (see `literature_summary.md`) |
| Feature importance | `phase_18/exports/feature_ranking.csv`, `phase_19/exports/shap_values.csv` |
| Correlation | `phase_18/exports/master_feature_table.csv`, full-dataset Pearson |
| Optimizer | `phase_20_recipe_optimizer/recipe_optimizer.py` |
| Industrial | JSPL discussions + Phase 13 cleaning semantics |

**Agreement codes:** ✓ agree | ✗ disagree | ? unknown | ⚠ leakage/misinterpretation risk

---

## 1. Raw Materials

### 1.1 Hot Metal (HM)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Semi-controllable (BF/route dependent); recipe lever at JSPL |
| **TTT relationship** | **Conditional negative** with sufficient O₂ (L5, L6); **positive** if decarburization bottleneck at high HMR |
| **Mechanism** | Sensible heat (liquid at ~1540°C) accelerates scrap/DRI melting; high carbon from HM requires O₂ for decarburization and slag foaming (CO generation) |
| **Interactions** | HM×O₂ (strong); HM×DRI (substitution); HM×Bucket; HM×energy |
| **Prediction** | Yes — via ratios (`HM_TO_DRI_RATIO`, `HM_TO_BUCKET_RATIO`) and interactions |
| **Optimization** | Yes — HM/DRI anti-correlated move constraint in optimizer |

**Data cross-check:**

| Source | Finding | Agreement |
|--------|---------|-----------|
| Literature | HM reduces TTT when O₂ coordinated (Duan 2014) | — |
| Raw Pearson HM vs TTT | +0.016 | ✗ (masked by O₂ confounding) |
| SHAP | `HM_TO_DRI_RATIO` 0.17; `HM_X_POWER` **1.54 (rank #1)** | Partial ✓ |
| Optimizer | HM/DRI opposite-direction rule; 2.5× relative-change penalty | ✓ |
| Industrial | HM used heavily at JSPL | ✓ |

**Physical WHY:** HM delivers enthalpy that would otherwise require electrical kWh. Without proportional oxygen, carbon accumulates, refining extends, and TTT rises.

---

### 1.2 DRI (Direct Reduced Iron)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Semi-controllable (shaft availability, metallization upstream) |
| **TTT relationship** | **Conditional** — share↑ often **increases** TTT (L3, L4); can **decrease** with hot DRI, high metallization in 94–96% band, coordinated C/O₂ |
| **Mechanism** | Gangue → slag; FeO → endothermic reduction or CO for foaming; high bulk density → melts at slag/metal interface; flat bath → arc voltage profile changes |
| **Interactions** | DRI×HM; DRI×CPC; DRI×lime/dolo; DRI×O₂; DRI grade×metallization |
| **Prediction** | Yes — **share and ratios**, not raw tonnes alone |
| **Optimization** | Yes — coupled with HM; not as independent "more is faster" |

**Does higher DRI always reduce TTT?** **No** (L4: DRI heats 60–100 min vs scrap 50–60 min). **Under what conditions?** Hot charged DRI, metallization 94–96%, optimized slag (min volume), sufficient carbon for foam, O₂ lancing matched to FeO load (L3, L13).

**Data cross-check:**

| Source | Finding | Agreement |
|--------|---------|-----------|
| Literature | Higher DRI burden → longer TTT, higher kWh/t | Context-dependent at JSPL (HM-heavy recipes) |
| Raw DRI vs TTT | +0.006 | ? (composition confounded) |
| `DRI_PCT_TC` | −0.24 Pearson | ✗ sign vs literature for DRI-heavy plants — JSPL is HM+DRI hybrid |
| SHAP | `CPC_X_DRI` 0.13; `SOLID_BURDEN_RATIO` 0.64 | Partial ✓ |
| Optimizer | DRI penalty 2.5×; HM/DRI coupling | ✓ |

**JSPL gap:** No metallization, gangue %, DRI temperature, or continuous feed rate in data.

---

### 1.3 HBI (Hot Briquetted Iron)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Semi-controllable; compacted DRI |
| **TTT relationship** | Similar to DRI but denser; slower dissolution if cold; **weak in JSPL data** (83% missing → imputed 0) |
| **Mechanism** | Same as DRI; briquetting affects dissolution kinetics |
| **Interactions** | HBI×DRI; HBI×Bucket; HBI×CPC |
| **Prediction** | Low priority — sparse signal |
| **Optimization** | Minor lever |

**Data:** HBI Pearson vs TTT −0.015; SHAP `HBI_SQ` 0.015 (rank #18). **Agreement:** ? — insufficient observations.

---

### 1.4 Scrap / Bucket

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable (charge recipe) |
| **TTT relationship** | **Nonlinear** — moderate scrap with HM/DRI can optimize; cold scrap ↑ melting time; bucket practice affects heat distribution |
| **Mechanism** | Scrap pile under electrodes during melting phase improves arc coupling vs flat DRI bath (L4); oxidized scrap increases slag FeO |
| **Interactions** | Bucket×CPC; Bucket×DRI; Bucket×HM; Bucket×lime |
| **Prediction** | Yes |
| **Optimization** | Yes — optimizer penalizes Bucket increases (0.8× excess) |

**Data:** Raw Bucket vs TTT +0.027; `BUCKET_X_CPC` SHAP **1.25 (#2)**; `SOLID_BURDEN_RATIO` 0.64. Literature on scrap vs DRI TTT (L4) suggests scrap-heavy can be faster — JSPL model captures carbon×scrap interaction, not linear scrap effect. **Agreement:** ✓ for interaction; ? for linear tonnage.

---

## 2. Energy Variables

### 2.1 Electrical Energy Consumed (kWh) — field `POWER`

| Dimension | Assessment |
|-----------|------------|
| **Classification** | **Intermediate + consequence**; semi-controllable in aggregate |
| **TTT relationship** | **Positive** — longer heats consume more kWh (L1, L2, L11); also **reverse**: low arc efficiency → more kWh per minute |
| **Mechanism** | E_elec = ∫P(t)dt; losses ∝ time; foamy slag and arc stability modulate effective kW transfer |
| **Interactions** | POWER×HM, POWER×OXY (removed by VIF); POWER_PER_TONNE; HM_X_POWER retained |
| **Prediction** | **Conditional** — high leakage if value is **post-heat total** |
| **Optimization** | **No** as decision variable — optimize burden/O₂/C; treat kWh as **outcome** |

**Dedicated investigation (JSPL industrial finding):**

```
Recipe lock-in (start of heat)          End of heat
        |                                      |
   Controllable: HM,DRI,Bucket,              Total kWh logged
   OXY setpoint,CPC,fluxes                   (POWER field)
        |                                      |
        +-------- Power-on time / TTT -------->+
```

| Question | Answer | Reference |
|----------|--------|-----------|
| Controllable input? | Only via **policy** (tap changer, chemistry), not exact kWh | L2 |
| Intermediate? | **Yes** — integrates process state | L1, L3 |
| Consequence of TTT? | **Partially yes** — fixed losses × time | L1, L11, TERI |
| Use in prediction? | Retrospective OK; prospective needs **planned** SEC or real-time partial energy | L2 |
| Use in optimization? | **No** (current optimizer treats as controllable — **misalignment**) | L2 |

**Data cross-check:**

| Source | Finding | Agreement |
|--------|---------|-----------|
| Literature | kWh ↔ time circular if both used to predict TTT | ⚠ |
| Raw POWER vs TTT | Pearson +0.114 (all heats); **+0.478 (TTT&lt;120 min)**; +0.472 in ranked pool (subset/engineered context) | ⚠ |
| POWER_PER_TONNE SHAP | 0.49 (#5) | ⚠ leakage |
| HM_X_POWER SHAP | **1.54 (#1)** | ⚠ encodes HM×energy collinearity |
| VIF history | Raw `POWER` removed (VIF 564); `OXY_X_POWER` removed | ✓ multicollinearity recognized |
| Optimizer | POWER in `CONTROLLABLE_NUMERIC`; physics penalty on **decreasing** POWER | ✗ treats as causal input |
| Industrial | Field is **kWh**, not kW | ✓ rename required |

**Physical WHY:** kWh is the time integral of arc power modulated by power factor, foamy slag, and interruptions. A heat that runs longer because of delays or poor melting **must** accumulate more kWh even with identical recipe intent.

---

### 2.2 Transformer Power (kW/MW)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable (equipment limit); **not in JSPL dataset** |
| **TTT relationship** | Higher available power → shorter power-on **if** heat transfer efficient (L3 arc efficiency) |
| **Mechanism** | P_arc ∝ V×I×√3×cosφ; limited by transformer and flicker |
| **Interactions** | Power×foamy slag; power×DRI feed rate (kg/min·MW) |
| **Prediction** | Add if SCADA available |
| **Optimization** | As **constraint** (MVA), not recipe tonnage |

**JSPL:** `Power Restriction` flag exists in optimizer — aligns with literature. **Agreement:** ✓ (constraint concept).

---

### 2.3 Power-on Time (Arcing Time)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Intermediate; major component of TTT |
| **TTT relationship** | **Strong positive** component of TTT |
| **Mechanism** | Time to melt and refine; reducible via foamy slag, HM, hot charge |
| **Interactions** | Correlates with kWh (L2 warns of circularity) |
| **Prediction** | **Yes** — or model TTT directly |
| **Optimization** | Minimize subject to quality |

**JSPL:** Not explicit column; embedded in TTT. CJCE (2025) models arcing time directly with R²≈0.89 on another DRI plant. **Gap:** decompose TTT sub-times in Phase 24 if logs exist.

---

### 2.4 Power-off Time

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Mostly response (delays, tapping, charging logistics) |
| **TTT relationship** | **Positive** — extends TTT without productive melting |
| **Mechanism** | Radiation losses from hot bath/refractory during idle periods |
| **Interactions** | Delay type × process phase (L1) |
| **Prediction** | Yes if delay logs exist |
| **Optimization** | Operational, not recipe |

**JSPL:** 299 long-delay heats retained (TTT up to 1439 min). **Agreement:** ✓ keep for two-stage model; current single model mixes regimes.

---

### 2.5 Chemical Energy (CPC, O₂, natural gas)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable |
| **TTT relationship** | **Conditional** — exothermic oxidation reduces electrical need but excessive O₂ without carbon can cool; carbon drives foamy slag |
| **Mechanism** | C+O→CO (+heat); CO foam shields arc; FeO+C→CO |
| **Interactions** | O₂×C (strong); C×DRI FeO; flux×C |
| **Prediction** | Yes — `OXYGEN_PER_TONNE`, `BUCKET_X_CPC`, `CPC_X_DRI` |
| **Optimization** | Yes — O₂ decrease penalized; CPC change limited |

**Data:** OXY Pearson +0.059 raw; `OXYGEN_PER_TONNE` SHAP 1.10 (#3). Optimizer O₂ physics penalty scale 6.0. **Agreement:** ✓

---

## 3. Oxygen & Carbon

### 3.1 Oxygen (OXY)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable |
| **TTT relationship** | **Nonlinear** — increases decarburization rate (↓ TTT) but excessive lancing without slag control can reduce efficiency |
| **Mechanism** | O₂ oxidizes C, Si, Fe → heat + CO/CO₂; FeO affects slag foam |
| **Interactions** | O₂×HM; O₂×CPC; O₂×DRI FeO load |
| **Prediction** | Yes (`OXYGEN_PER_TONNE`) |
| **Optimization** | Yes |

---

### 3.2 CPC (Carbon Powder Charge)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable |
| **TTT relationship** | **Conditional negative** via foamy slag and chemical heating |
| **Mechanism** | Carbon reduces FeO, generates CO for foam; supplies bath carbon |
| **Interactions** | CPC×Bucket (#2 SHAP interaction); CPC×DRI |
| **Prediction** | Yes |
| **Optimization** | Yes — CPC max change penalty |

---

### 3.3 Carbon Injection (distinct stream)

Not separated from CPC in JSPL data. Literature (Morales 2025) treats injection rate and particle size as foaming levers. **Gap:** if injection kg/min logged separately, add in Phase 24.

---

### 3.4 Foamy Slag (operational state)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Semi-controllable via C, O₂, flux, FeO |
| **TTT relationship** | **Negative on TTT** when present — improves arc coupling, reduces kWh/min |
| **Mechanism** | CO bubbles in slag envelope arc; reduces radiation to walls |
| **Interactions** | FeO×C×O₂; basicity×MgO |
| **Prediction** | Proxy via C/O₂/flux ratios — no direct measurement |
| **Optimization** | Indirect |

**Industrial vs literature:** ✓ agree on mechanism. **Data:** not measured — **unknown** validation.

---

## 4. Fluxes

### 4.1 Lime (LIME)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable |
| **TTT relationship** | **Weak positive** at excessive levels (more slag to melt); **necessary** for basicity with DRI gangue |
| **Mechanism** | CaO neutralizes SiO₂; slag volume ↑ → kWh ↑ (~0.37–0.50 kWh/kg slag former, L4) |
| **Interactions** | Lime×DRI gangue; lime×doloma; lime×O₂ |
| **Prediction** | Low raw signal; use `FLUX_PER_TONNE`, ratios |
| **Optimization** | Yes — bounded |

**Data:** LIME Pearson +0.031; removed in VIF pass. **Agreement:** ✓ weak linear effect expected.

---

### 4.2 Dolomite (DOLO)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Controllable |
| **TTT relationship** | Indirect via MgO saturation, refractory protection, slag volume |
| **Mechanism** | MgO prevents refractory wear; affects viscosity and foaming |
| **Interactions** | DOLO×LIME; DOLO×Bucket |
| **Prediction** | `DOLO_SQ` SHAP 0.23 (#6) — investigate collinearity |
| **Optimization** | Yes |

---

### 4.3 Basicity

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Derived (CaO/SiO₂, B3) |
| **TTT relationship** | **Conditional** — affects de-P, slag volume, foaming |
| **Mechanism** | Basicity set by lime + gangue input |
| **Prediction** | Engineer from flux + implied gangue if DRI quality known |
| **Optimization** | Yes within band 1.8–2.1 (L4) |

**JSPL:** Not computed. **Gap:** Phase 24 feature if DRI chemistry available.

---

## 5. Operations

### 5.1 Shift

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Uncontrollable context |
| **TTT relationship** | **No clear relationship** expected |
| **Mechanism** | Crew, maintenance schedule, power tariff |
| **Prediction** | Weak — SHAP <0.02 |
| **Optimization** | No |

**Data:** `SHIFT_LABEL` SHAP 0.013. **Agreement:** ✓

---

### 5.2 Total Charge (T C)

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Semi-controllable |
| **TTT relationship** | **Positive** — more tonnes → more melting (but normalize inputs per tonne) |
| **Mechanism** | Heat capacity scales with mass |
| **Prediction** | Use ratios (per-tonne features) |
| **Optimization** | Band constraint 115–150 t |

---

### 5.3 Tap Weight

| Dimension | Assessment |
|-----------|------------|
| **Classification** | **Response** (yield, heel, losses) |
| **TTT relationship** | Correlated post-hoc |
| **Prediction** | **Exclude** as pre-heat input |
| **Optimization** | No |

**JSPL:** Not in model — **correct**.

---

### 5.4 Delays

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Exogenous / operational |
| **TTT relationship** | **Strong positive** |
| **Mechanism** | Idle time at temperature |
| **Prediction** | Flag or two-stage model |
| **Optimization** | Minimize operationally |

**JSPL:** 299 shutdown-like heats inflate variance. **Agreement:** ✓ with L1, L10.

---

### 5.5 Power Restriction

| Dimension | Assessment |
|-----------|------------|
| **Classification** | Exogenous constraint |
| **TTT relationship** | **Positive** when active — limits kW → extends power-on |
| **Mechanism** | Transformer cap or grid flicker management |
| **Prediction** | **Yes — binary flag** |
| **Optimization** | Hard constraint (no POWER increase) |

**Optimizer:** `power_restricted` blocks POWER increases — **Agreement:** ✓

---

## 6. Engineered Features (Production Model)

| Feature | SHAP | Literature | Leakage risk |
|---------|------|------------|--------------|
| HM_X_POWER | 1.54 | HM×energy interaction real physically | **High** if POWER is end-of-heat |
| BUCKET_X_CPC | 1.25 | Scrap×carbon for foam | Low |
| OXYGEN_PER_TONNE | 1.10 | O₂ intensity key (Duan 2014) | Low |
| SOLID_BURDEN_RATIO | 0.64 | Solid vs liquid burden | Low |
| POWER_PER_TONNE | 0.49 | SEC proxy | **High** |
| CHARGE_BALANCE_ERROR | ~0 | Data QC only | N/A — exclude |

---

## 7. Summary Table — TTT Relationship Direction

| Variable | Literature → TTT | JSPL correlation / SHAP | Align? |
|----------|-------------------|-------------------------|--------|
| HM | Conditional ↓ | Weak raw; interaction high | Partial |
| DRI share | Often ↑ at high % | DRI_PCT negative | Context |
| Bucket/scrap | Nonlinear | Interaction high | ✓ |
| kWh (POWER) | ↑ with time | Positive | ⚠ leakage |
| O₂ | Nonlinear ↓ | Per-tonne high SHAP | ✓ |
| CPC | ↓ via foam | Interaction high | ✓ |
| Lime/dolo | ↑ if excess slag | Weak | ✓ |
| Delays | ↑↑ | Outliers | ✓ |
| Metallization | 94–96% optimum | Not in data | ? |

---

*End of industrial variable review. See `cause_effect_map.md`, `research_gaps.md`, and `phase_24_recommendations.md` for downstream actions.*
