# Phase 24 Action Plan (from Phase 23.5 Causal Audit)

**Status:** Recommendations only — **do not execute** until Phase 24 is formally approved.  
**Frozen until then:** `production_model.pkl`, `preprocessing_pipeline.pkl`, `recipe_optimizer.pkl`, Phase 22.5 platform.

---

## 1. Immediate Industrial Confirmations (Blockers)

Before any model work, obtain written JSPL answers:

| # | Question | Affects | If "final total" | If "planned setpoint" |
|---|----------|---------|------------------|----------------------|
| Q1 | Is `OXY` the **planned O₂ budget** or **final consumption**? | 5 production features | Reclassify as LEAKY; REMOVE from planning model | KEEP after verification |
| Q2 | Is `CPC` the **planned carbon charge** or **total injected**? | 4 production features | Reclassify as LEAKY | KEEP |
| Q3 | At what timestamp is each row recorded? (tap time vs next charge) | All variables | Defines prediction moment | — |
| Q4 | Is `POWER`/`EE_KWH` ever estimated before tap for planning? | Optimizer + UI | If never → remove from all planning paths | If yes → document field |
| Q5 | Can SCADA provide power-on time, delay codes, restriction flags per heat? | Phase 24 features | Enables decomposition | — |

**Owner:** JSPL process engineering + IT/SCADA.  
**Deliverable:** One-page data dictionary with measurement timestamp per column.

---

## 2. Phase 24.1 — Documentation (No Model Change)

| Action | Detail | Risk |
|--------|--------|------|
| Rename in docs/UI labels only | `POWER` → `EE_KWH` with tooltip "post-heat total" | Low — after approval |
| Add temporal metadata | `feature_temporal_audit.xlsx` → living data dictionary | None |
| Mark optimizer fields | Flag EE_KWH as outcome in operator training materials | None |

**Do not** rename code columns or retrain in this sub-phase without explicit sign-off.

---

## 3. Phase 24.2 — Leakage Ablation Study (Experimental Branch)

**Objective:** Quantify MAE impact of removing leaky features honestly.

| Step | Action |
|------|--------|
| 1 | Create experimental branch (not production) |
| 2 | **Model A (replica):** Current 22 features — baseline MAE 3.06 |
| 3 | **Model B (clean planning):** Remove `HM_X_POWER`, `POWER_PER_TONNE`, `CHARGE_BALANCE_ERROR` |
| 4 | **Model C (clean + verify):** Model B + reclassify OXY/CPC features per Q1/Q2 answers |
| 5 | Time-based train/test split (mandatory — Sjunnesson 2019) |
| 6 | Report MAE on: all heats, TTT<90, TTT<120, no-restriction subset |

**Expected outcome:** Model B MAE may **increase** short-term — report as "honest planning MAE."

---

## 4. Phase 24.3 — Planning Model Feature Set (List A)

### 4.1 Definite KEEP (14 production features)

`SOLID_BURDEN_RATIO`, `HM_TO_DRI_RATIO`, `BURDEN_SHARE_RANGE`, `HM_TO_BUCKET_RATIO`, `BUCKET_X_DOLO`, `FLUX_PER_TONNE`, `DOLO_X_LIME`, `DOLO_SQ`, `DRI_TO_HBI_RATIO`, `BUCKET_X_HBI`, `DOLO_X_HBI`, `HBI_SQ`, `SHIFT_LABEL`, `SHIFT_C`

### 4.2 Definite REMOVE from planning model (3)

| Feature | Reason |
|---------|--------|
| `HM_X_POWER` | Embeds post-heat EE_KWH (#1 SHAP — leakage-driven importance) |
| `POWER_PER_TONNE` | SEC is post-heat outcome |
| `CHARGE_BALANCE_ERROR` | QC artifact, SHAP ≈ 0 |

### 4.3 Conditional on JSPL verification (5)

`OXYGEN_PER_TONNE`, `BUCKET_X_CPC`, `CPC_X_DRI`, `FLUX_TO_CARBON_RATIO`, `CPC_X_HBI`

### 4.4 ADD to planning model (new)

| Feature | Source |
|---------|--------|
| `POWER_RESTRICTION_FLAG` | Optimizer already has; add to model |
| `HM_X_OXY_NORM` | Replace `HM_X_POWER` (Duan 2014) |
| `DRI_METALLIZATION_PCT` | Shaft assay join (if available) |
| `DELAY_FLAG` or regime classifier | MES / TTT threshold |

---

## 5. Phase 24.4 — Online Model (List B) — Separate Track

Only if SCADA time-series available:

| Signal | Use |
|--------|-----|
| Cumulative EE_KWH(t) | Mid-heat remaining time update |
| Cumulative OXY(t) | Refining progress |
| Elapsed power-on | Arcing time model (CJCE 2025) |
| Delay event flags | Regime switch |

**Do not** mix List B features into List A training without timestamp alignment.

---

## 6. Phase 24.5 — Optimizer Redesign (After Planning Model Validated)

| Current (Phase 20.2) | Recommended |
|---------------------|-------------|
| `POWER` in `CONTROLLABLE_NUMERIC` | **Remove** from decision vector |
| Penalize POWER decrease | **Remove** — kWh is outcome |
| Vary EE_KWH in candidate recipes | Optimize burden, flux, O₂/C **setpoints only** |
| Predicted TTT + penalties | Add predicted SEC as **secondary objective** (optional) |

**Dependency:** New planning model (24.3) must not require EE_KWH input.

---

## 7. Phase 24.6 — Feature Engineering Rules (Permanent)

1. **No post-process column** in planning features unless timestamp proves availability before prediction.
2. **No target-derived encodings** (Phase 16 `SHIFT_TARGET_ENCODED_ANALYSIS` pattern forbidden).
3. **Document measurement timing** for every new column at ingest.
4. **Interaction terms:** only multiply variables available at the same temporal stage.
5. **Per-tonne normalization:** numerator and denominator must share availability class.

---

## 8. Validation Protocol

| Check | Criterion |
|-------|-----------|
| Temporal split | Train on past months, test on future |
| Leakage ablation | ΔMAE when removing EE_KWH features |
| Planning simulation | Predict from recipe **without** EE_KWH field |
| Industrial blind review | 20 heats — ops agrees direction of recommendations |
| Optimizer feasibility | No recipe suggests "change kWh" as primary lever |

---

## 9. Success Metrics (Phase 24 Exit)

| Metric | Target | Notes |
|--------|--------|-------|
| Planning MAE (honest) | ≤ 3.2 min initially | May exceed 3.06 until new features added |
| Planning MAE (final) | 2.5–2.9 min | With metallization + flags |
| R² (planning) | 0.40–0.48 | On normal heats |
| Leaky features in production | **0** | Zero EE_KWH-derived |
| JSPL sign-off | Documented | Q1–Q5 answered |

---

## 10. Sequenced Roadmap

```
Week 1–2:  JSPL Q1–Q5 confirmation + data dictionary
Week 3:    Leakage ablation (Models A/B/C) on branch
Week 4:    Feature engineering v2 (planning-safe only)
Week 5:    Feature selection v2 + model training
Week 6:    Industrial validation workshop
Week 7+:   Optimizer v2 (only after planning model signed off)
```

---

## 11. What NOT to Do

- Do not remove features from frozen production artifacts in Phase 23.5/24 without versioned release.
- Do not assume OXY/CPC are setpoints until JSPL confirms.
- Do not reintroduce EE_KWH via aliases (`SPECIFIC_ENERGY`, `POWER_INTENSITY`, etc.).
- Do not report inflated MAE improvements without time-split validation.

---

## 12. Master Recommendation Table (All Audited Categories)

| Category | Count (approx.) | Action |
|----------|-----------------|--------|
| **KEEP** | ~53 burden/flux/shift features | Planning model core |
| **REMOVE** | 15 energy-derived + target encodings | Exclude from planning |
| **VERIFY WITH JSPL** | 26 OXY/CPC-dependent | Pending Q1/Q2 |
| **UNKNOWN** | 0 after Q1–Q2 | Resolve before modeling |

---

*Phase 23.5 audit complete. Phase 24 executes only on approval.*
