# Phase 24 Recommendations (from Phase 23 Scientific Review)

**Status:** Recommendations only — **no implementation in Phase 23**.  
**Goal:** Redesign feature engineering, modeling, and optimizer assumptions with literature-backed causality.

**Baseline:** MAE 3.06 min, R² 0.366, 22 features, frozen Phase 19–20.2 artifacts.

---

## 1. Variable Renaming (Documentation & Schema)

| Current | Recommended | Rationale |
|---------|-------------|-----------|
| `POWER` | `ELEC_ENERGY_KWH` or `EE_KWH` | JSPL confirmed: not kW (L1, L2) |
| `POWER_PER_TONNE` | `SEC_KWH_PER_T` | Specific electrical energy (kWh/t) |
| `HM_X_POWER` | Remove → `HM_X_PLANNED_SEC` or `HM_X_OXY` | Avoid outcome×burden leakage |

**Action:** Update data dictionary, API field labels, UI copy, and feature engineering comments in Phase 24 — not in Phase 23.

---

## 2. Variables to Remove from Prediction Model

| Feature | Reason | Literature |
|---------|--------|------------|
| `HM_X_POWER` | High leakage — HM × end-of-heat kWh | L2 |
| `POWER_PER_TONNE` (if EE is end-of-heat) | SEC encodes realized duration | L1, L11 |
| `CHARGE_BALANCE_ERROR` | Data QC artifact; SHAP ≈ 0 | Phase 13 logic |

**Caveat:** If JSPL can provide **planned SEC** or **first-bucket energy budget** available at heat start, a planned-SEC feature may be valid (see §4).

---

## 3. Variables to Add (New Data or Engineering)

### 3.1 Tier A — Requires new data columns

| Feature | Formula / source | Expected benefit |
|---------|------------------|------------------|
| `DRI_METALLIZATION_PCT` | Shaft assay | Resolve expert hypothesis; L3 optimum 94–96% |
| `DRI_GANGUE_PCT` | Shaft assay | Slag volume driver (L4) |
| `DRI_TEMP_C` | Delivery log | Hot vs cold DRI (TERI, L3) |
| `POWER_ON_MIN` | SCADA | Decompose TTT (L1) |
| `POWER_OFF_MIN` | SCADA | Delay capture |
| `DELAY_MIN` | MES | Regime flag |
| `DELAY_FLAG` | TTT > P95 or coded | Two-stage model |
| `POWER_RESTRICTION_FLAG` | Ops log | Already in optimizer — add to model |

### 3.2 Tier B — Engineer from existing columns

| Feature | Formula | Rationale |
|---------|---------|-----------|
| `HM_RATIO` | HM / T C | Duan (2014) HMR |
| `DRI_RATIO` | DRI / T C | Burden share |
| `HM_X_OXY` | HM × OXY / T C | Coordinated practice |
| `DRI_X_CPC` | DRI × CPC / T C | FeO × carbon foam (L7) |
| `OXY_PER_HM` | OXY / max(HM, ε) | O₂ intensity per HM tonne |
| `CARBON_PER_SOLID_BURDEN` | CPC / (DRI+HBI+Bucket) | Foam agent intensity |
| `FLUX_PER_SOLID_BURDEN` | (LIME+DOLO) / solid burden | Gangue neutralization load |
| `LIME_TO_DOLO_RATIO` | LIME / DOLO | Basicity proxy |
| `VIRGIN_BURDEN_RATIO` | (DRI+HBI) / T C | Memoli (2021) distinction |
| `METALLIZATION_PROXY` | If not available: omit — **do not impute** | |

### 3.3 Tier C — Nonlinear transforms (literature-motivated)

| Feature | Form | When |
|---------|------|------|
| `DRI_RATIO_SQ` | Only if metallization data confirms U-shaped effects | L3 |
| `HM_RATIO_SQ` | Test for decarb penalty at high HMR | L5, L6 |
| `OXY_PER_TONNE_SQ` | Diminishing returns on lancing | L5 |

---

## 4. Interaction Features (Priority Order)

1. **`HM_X_OXY_NORM`** — HM burden × specific oxygen (replace HM_X_POWER).
2. **`DRI_X_CPC_NORM`** — FeO load × carbon (already partially present as `CPC_X_DRI`; keep normalized).
3. **`BUCKET_X_CPC`** — retain (SHAP #2; L7).
4. **`SCRAP_X_HM`** or `BUCKET_X_HM` — scrap melting assisted by HM sensible heat.
5. **`FLUX_X_DRI_RATIO`** — gangue neutralization demand.
6. **`POWER_RESTRICTION_X_HM`** — restriction slows HM advantage.

**Remove:** `OXY_X_POWER` (already VIF-removed; do not reintroduce).

---

## 5. Modeling Architecture Recommendations

### 5.1 Two-stage heterogeneity model
```
Stage 1: Classify delay vs normal heat (DELAY_FLAG or TTT threshold)
Stage 2a: Regress TTT on normal heats (TTT < 90 min)
Stage 2b: Separate model or censor for delay heats
```
**Reference:** Knutsen (2020) sub-process times; 299 JSPL flagged heats.

### 5.2 Causal feature tiers (see `cause_effect_map.md`)
- **Tier 1 only** for prospective prediction at recipe submit.
- **Tier 3** (kWh, tap weight) as **downstream targets**, not inputs.

### 5.3 Alternative targets to explore
| Target | Use case | Reference |
|--------|----------|-----------|
| Power-on time | Less entangled with power-off delays | CJCE 2025 |
| SEC (kWh/t) | Energy optimization product | Hein 2025 |
| TTT | Operations scheduling (current) | JSPL |

### 5.4 Validation protocol
- **Time-based split** (mandatory — L2 critique).
- Report MAE on: all heats, normal only (TTT<90), no-restriction only.
- **Ablation:** with vs without energy features to quantify leakage.

---

## 6. Optimizer Recommendations (Phase 24.2)

### 6.1 Remove from decision vector
- `POWER` / `EE_KWH` — not a recipe degree of freedom.

### 6.2 Add / strengthen
- `POWER_RESTRICTION_FLAG` as hard constraint (already present).
- Metallization-aware DRI bounds when data available.
- **O₂ lower bound** as function of HM_RATIO (from Duan 2014 sensitivity).

### 6.3 Revise physics penalties
| Current | Recommended |
|---------|-------------|
| Penalize POWER decrease | Remove — kWh is outcome |
| Penalize OXY decrease unconditionally | Penalize only if predicted decarb risk (HM_RATIO high) |
| HM/DRI opposite direction | Retain |

### 6.4 Multi-objective extension (optional)
- Pareto: minimize **predicted TTT** and **predicted SEC** separately.
- Literature supports SEC model distinct from TTT (Hein 2025).

---

## 7. Feature Set Proposal (Starting Point for Phase 24)

**Proposed 20–25 features (no end-of-heat kWh):**

| # | Feature | Type |
|---|---------|------|
| 1 | HM_RATIO | Burden |
| 2 | DRI_RATIO | Burden |
| 3 | BUCKET_RATIO | Burden |
| 4 | HBI_RATIO | Burden |
| 5 | HM_TO_DRI_RATIO | Ratio |
| 6 | SOLID_BURDEN_RATIO | Ratio |
| 7 | BURDEN_SHARE_RANGE | Ratio |
| 8 | OXYGEN_PER_TONNE | Intensity |
| 9 | HM_X_OXY_NORM | Interaction |
| 10 | BUCKET_X_CPC | Interaction |
| 11 | CPC_X_DRI | Interaction |
| 12 | BUCKET_X_DOLO | Interaction |
| 13 | FLUX_PER_TONNE | Flux |
| 14 | FLUX_TO_CARBON_RATIO | Flux |
| 15 | LIME_TO_DOLO_RATIO | Flux |
| 16 | DOLO_SQ | Nonlinear (re-test) |
| 17 | DRI_METALLIZATION_PCT | Quality (if available) |
| 18 | POWER_RESTRICTION_FLAG | Constraint |
| 19 | DELAY_FLAG or SHIFT | Regime |
| 20 | SHIFT_LABEL | Context |

**Compare to production 22:** drop `HM_X_POWER`, `POWER_PER_TONNE`, `CHARGE_BALANCE_ERROR`; add HM_X_OXY, flags, metallization.

---

## 8. Expected Model Improvements

| Metric | Current | Phase 24 target | Conditions |
|--------|---------|-----------------|------------|
| MAE (all heats) | 3.06 min | 2.5–2.9 min | Two-stage + flags |
| MAE (normal heats) | ~2.8* est. | 2.3–2.6 min | Remove leakage |
| R² | 0.366 | 0.42–0.50 | + metallization |
| Optimizer feasibility | kWh varied | Chemistry/burden only | More realistic |
| Industrial trust | Mixed POWER semantics | Clear kWh vs kW | Renaming |

*Normal-heat MAE estimated — recompute in Phase 24 evaluation script.

**Honesty note:** Removing leaky features may **worsen** metrics initially; report both "legacy leaky" and "causally clean" benchmarks.

---

## 9. Phase 24 Work Plan (Suggested Sequence)

1. **Data audit** — confirm POWER is end-of-heat total kWh from SCADA; document timestamp.
2. **Rename & dictionary** — schema only, no model change yet.
3. **Leakage ablation study** — retrain experimental models without energy features (separate branch).
4. **Request metallization** — join shaft assay to heat ID.
5. **Feature engineering v2** — implement Tier B/C features.
6. **Feature selection v2** — Phase 18 methodology repeated on clean feature pool.
7. **Model development v2** — time-split validation.
8. **Optimizer v2** — remove kWh from decision vector; align penalties.
9. **Industrial validation** — blind review with ops team.

---

## 10. Explicit Non-Recommendations

- **Do not** hardcode "metallization ↑ → TTT ↓" as a rule in optimizer.
- **Do not** assume POWER is kW in any new code.
- **Do not** retrain production artifacts until Phase 24 approval gate.
- **Do not** impute metallization from DRI tonnage — no valid proxy in literature.

---

## 11. Key References for Phase 24 Implementation

1. Kirschen et al. (2011) — DRI energy balance, metallization optimum.  
2. Sjunnesson et al. (2019) — causality warnings for time/energy inputs.  
3. Duan et al. (2014) — HM×O₂ coordination.  
4. Memoli et al. (2021) — DRI vs scrap TTT benchmarks.  
5. Hein et al. (2025) — physics-inspired feature engineering template.  
6. Knutsen et al. (2020) — TTT sub-process decomposition.  

---

*Phase 23 deliverable — recommendations for Phase 24 only.*
