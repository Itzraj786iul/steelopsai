# Phase 31 Recommendations — From Industrial Validation to Digital Twin

**Prepared by:** Phase 30 Industrial Validation  
**Prerequisite:** Phase 30 complete — production unchanged  
**Target:** Scientifically defensible decision support for JSPL EAF

---

## P0 — Must Do Before Production Optimizer Promotion

### 1. Redesign optimizer decision vector

**Remove:** `POWER` (EE_KWH) from `CONTROLLABLE_NUMERIC`  
**Keep:** HM, DRI, HBI, Bucket, LIME, DOLO  
**Reframe:** CPC → Target Carbon Program; OXY → Target Oxygen Program  
**Add as constraints:** Power_Restriction, Transformer Tap (when available)

**Deliverable:** `research/phase_31_*/experimental_optimizer_v2.py` — never overwrite `recipe_optimizer.pkl`

### 2. Planning-safe prediction model

Retrain or deploy Phase 24 leakage-free feature set (dataset A/B) without:
- `HM_X_POWER`
- `POWER_PER_TONNE`
- Raw EE_KWH at planning time

**Target:** Honest planning MAE ~3.2–3.3 min (accept information ceiling from Phase 27)

### 3. Reject POWER recommendations in UI/API

Until optimizer v2 ships, flag any recommendation that changes POWER as **"Non-controllable outcome — do not implement"** (Phase 30 feasibility logic already classifies these as Rejected)

---

## P1 — High Value Engineering

### 4. Instrument missing P0 variables

Per Phase 27 expected information gain:

| Variable | Expected MAE gain | Integration |
|----------|-------------------|-------------|
| Delay codes | ~2.0 min | SCADA/MES |
| Power-on time | ~1.5 min | SCADA |
| Power-off time | ~1.2 min | SCADA |
| Power restriction flag | ~0.6 min | Already in API — add to optimizer constraint |

### 5. Implement Phase 30 confidence framework

Multi-factor scores:
- Historical similarity (planning vars only)
- Feature-space density
- Prediction uncertainty (CI width)
- Outlier score
- Recommendation feasibility class

### 6. Causal explanation engine

Deploy `recommendation_templates.md` patterns in API explainability layer — metallurgical chains, not deltas.

### 7. Live validation loop

When HMI heats 4618204–4618213 appear in next historical export:
- Backfill `actual_ttt` in `live_validation_results.csv`
- Compute true MAE on today's campaign
- Recalibrate confidence tiers

---

## P2 — Digital Twin Architecture

### 8. Two-layer model stack

```
Layer 1 — Planning model (burden + flux + programs → TTT)
Layer 2 — Energy outcome model (planning inputs → EE_KWH band informational)
Layer 3 — Delay classifier (Phase 25 two-stage — normal vs delay regime)
```

### 9. Process dependency graph in MES

Operationalize `industrial_causal_graph.md` as operator training material and constraint documentation.

### 10. Similar heat quality gate

Use `similarity_validation.xlsx` criteria:
- Require recipe similarity >75% **and** outcome similarity >70% before citing supporting heats
- Exclude delay outliers (TTT >120 min) from neighbor search

---

## P3 — Research & Governance

### 11. JSPL confirmation workshops

Resolve timing for OXY and CPC:
- Setpoint at heat start vs final totalizer?
- If final totals → move to outcome layer like EE_KWH

### 12. Optimizer failure prevention

From `optimizer_failure_analysis.xlsx`:
- Widen search only on planning variables
- Return structured "hold current practice" when no feasible candidate
- Never fail silently — always explain boundary (CPC low, OXY high, charge low)

### 13. Scientific review gate

Before any production promotion:
- [ ] No POWER in optimizer output
- [ ] Feasibility review: >80% Accepted or Questionable, 0% Rejected POWER
- [ ] Live MAE within 1.5× training MAE on 20+ recent heats
- [ ] Operator sign-off from shift leaders

---

## Recommended Phase 31 Directory Structure

```
research/
└── phase_31_digital_twin_foundation/
    ├── experimental_optimizer_v2.py
    ├── planning_safe_model/
    ├── energy_outcome_model/
    ├── live_validation_backfill.py
    └── operator_acceptance_study/
```

---

## What NOT to Do in Phase 31

- Do not overwrite Phase 19 `production_model.pkl` without formal review
- Do not deploy optimizer v2 to Render without parallel A/B with Phase 20.2
- Do not claim digital twin readiness until P0 sensors are integrated (current readiness ~30%)

---

## Expected Phase 31 Outcomes

| Question | Phase 31 answer |
|----------|-----------------|
| Which variables are controllable? | Planning matrix locked in `variable_control_matrix.xlsx` |
| Are recommendations achievable? | Optimizer v2 — zero POWER deltas |
| Real plant accuracy? | Live MAE with actual TTT backfill |
| Why optimizer failures? | Structured failure taxonomy + expanded feasible region |
| Industrial rules supported? | Validated rules in MES dashboards |
| Confidence calibrated? | Multi-factor framework deployed |
| Digital twin ready? | Two-layer model + P0 instrumentation roadmap |

---

*Phase 30 confirms the science. Phase 31 builds the engineering.*
