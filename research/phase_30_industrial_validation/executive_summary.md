# Phase 30 — Executive Summary
## Industrial Validation & Scientific Optimizer Redesign

**Research phase only** — Production artifacts (Phase 19 model, Phase 20.2 optimizer, backend, frontend) **unchanged**  
**Date:** 2026-07-09  
**Location:** `research/phase_30_industrial_validation/`

---

## Purpose

Phase 30 makes the JSPL EAF TTT AI **scientifically defensible** and **industrially realistic** by:

1. Auditing every variable for controllability and measurement timing
2. Proving that **Electrical Energy (kWh) must not be an optimizer decision variable**
3. Validating predictions and recommendations against **live Shift B HMI heats**
4. Classifying whether operators would **actually implement** each recommendation
5. Establishing the foundation for a true digital twin in Phase 31

---

## Headline Findings

### 1. Electrical Energy is an outcome, not a control

JSPL confirmed `POWER` = **EE_KWH** (post-heat totalizer). Phase 20.2 optimizes it in **100% of successful live runs** (7/7), always recommending 368–1,712 kWh reductions flagged "Review physics." **This is scientifically incorrect for planning-time optimization.**

### 2. Live plant validation (10 HMI heats)

| Metric | Result |
|--------|--------|
| Predictions generated | 10/10 |
| Avg predicted TTT | 44.9 min |
| Prediction confidence | 9 High, 1 Low (heat 4618204) |
| Optimizer success | 7/10 |
| Optimizer failure | 3/10 (4618211, 4618210, 4618204) |
| Avg saving (successful) | 1.62 min (0.54–2.84 min) |
| Actual TTT available | **Pending** — heats not yet in historical export (max DB heat 4617768) |

### 3. Recommendation feasibility (operator lens)

Using Phase 30 criteria ("Would an operator actually do this?"):

| Classification | Count (variable-level) |
|----------------|------------------------|
| **Accepted** | 41 |
| **Rejected** | 7 (all **POWER** adjustments) |
| **Questionable** | 1 |
| **Impossible** | 3 (optimizer failures) |

**Only 1 of 7 heat-level recommendations fully Accepted** (4618206) when POWER rejection is applied at heat level. **6/7 successful optimizations are Rejected** because they include non-controllable electrical energy changes.

### 4. Optimizer failure root causes

| Heat | Primary cause |
|------|---------------|
| 4618211 | Search failure — CPC 392 kg extreme |
| 4618210 | Historical boundary — Power at P95 |
| 4618204 | OXY above P95 + DRI below range + low charge |

### 5. Similar heat validation

- Mean recipe similarity: **77.5%**
- Mean outcome similarity: **75.8%**
- 32/50 neighbor pairs rated **"Truly similar"** (recipe >75% and TTT within 8 min)
- Similarity is adequate for burden; outcome match weaker when delay/outlier heats are neighbors

### 6. Historical operating rules confirmed

- HM↑ → OXY↓ (high-HM heats average lower oxygen)
- HM ↔ DRI negatively correlated (r ≈ −0.31)
- Bucket↑ → Energy↑ (+3,500 kWh mean with scrap)
- High lime → longer TTT (+2.1 min P75 vs P25)

---

## Scientific Comparison: Current vs Best Practice

| Aspect | Current (Phase 20.2) | Industrial best practice | Agreement |
|--------|----------------------|--------------------------|-----------|
| Decision variables | 9 including POWER | 8 planning vars + constraints | **Disagree** |
| Energy optimization | Reduce kWh setpoint | Control tap, restriction, burden | **Disagree** |
| Burden rebalance | HM↔DRI moves | Standard JSPL practice | **Agree** |
| Flux adjustments | Minor LIME/DOLO | With quality approval | **Partial** |
| Oxygen/CPC | Final totals optimized | Program targets | **Partial** |

---

## Deliverables Produced

| File | Part |
|------|------|
| `variable_control_matrix.xlsx` | Part 2 |
| `optimizer_variable_review.md` | Part 3 |
| `industrial_causal_graph.md` | Part 4 |
| `live_validation_results.csv` | Part 5 |
| `optimizer_feasibility_review.xlsx` | Part 6 |
| `industrial_operating_rules.md` | Part 7 |
| `similarity_validation.xlsx` | Part 8 |
| `recommendation_templates.md` | Part 9 |
| `optimizer_failure_analysis.xlsx` | Part 10 |
| `confidence_framework.md` | Part 11 |
| `optimizer_scientific_review.xlsx` | Part 12 |
| `phase_31_recommendations.md` | Part 13 |
| `plots/*.png` | Part 13 |

---

## Success Criteria Assessment

| Criterion | Status |
|-----------|--------|
| No production code/models modified | ✓ |
| Every recommendation scientifically explainable | ✓ (`recommendation_templates.md`) |
| EE_KWH formally outcome not control | ✓ |
| Live HMI data used | ✓ (actual TTT pending export) |
| Recommendations vs industrial practice | ✓ (6/7 rejected at heat level) |
| Phase 31 foundation | ✓ |

---

## Immediate Conclusion

The production system **predicts reasonably** on today's Shift B heats (41.9–47.9 min band, high similarity). The production optimizer **mathematically improves TTT** but **recommends non-physical electrical energy changes** that JSPL operators cannot implement at planning time. **Phase 31 must redesign the optimizer around planning controllables only** and optionally retrain with leakage-free features before digital twin deployment.

---

*Run `python phase_30_pipeline.py` to regenerate data artifacts.*
