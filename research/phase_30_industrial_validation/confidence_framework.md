# Confidence Framework — Phase 30 Calibration Proposal

**Status:** Research recommendation — does not replace production Phase 28.1/29 confidence  
**Problem:** Current confidence is dominated by historical similarity to recipe vector; it under-penalizes leakage features and over-confident on live heats with impossible optimizer outputs.

---

## Current System (Production)

| Signal | Weight (implicit) | Limitation |
|--------|-------------------|------------|
| Charge vs P5–P95 | High | Good for charge band |
| Variable vs historical bands | Medium | OXY/CPC timing uncertain |
| Historical similarity (k-NN) | High in Phase 29 | Recipe match ≠ outcome match |
| Prediction quality tier | Medium | Does not use actual TTT |
| Recommendation confidence | Medium | Penalizes stability, not physics class |

**Phase 29.1 result:** 9/10 heats labeled **High** prediction confidence; 3/10 optimizer failures; 1 heat (4618204) truly Low confidence.

---

## Proposed Multi-Factor Confidence (Phase 31)

### Prediction Confidence Score (0–100)

```
S_pred = 0.30 × S_similarity
       + 0.25 × S_density
       + 0.20 × S_uncertainty
       + 0.15 × S_outlier
       + 0.10 × S_feature_timing
```

| Component | Definition | Computation |
|-----------|------------|-------------|
| **Historical similarity** | k-NN recipe distance | Existing Phase 29 `historical_similarity_pct` |
| **Feature-space density** | Local neighborhood size | Count heats within Mahalanobis radius r in planning features only (exclude POWER) |
| **Prediction uncertainty** | Model disagreement / MAE prior | CI width / (2 × MAE); wider → lower score |
| **Outlier score** | Distance from training manifold | Normalized L2 z-score across planning variables |
| **Feature timing safety** | Leakage penalty | −20 if prediction uses EE_KWH-derived features at planning time |

**Tier mapping:**

| Score | Tier |
|-------|------|
| 80–100 | High |
| 60–79 | Medium |
| 40–59 | Low |
| <40 | Very Low |

### Recommendation Confidence Score (0–100)

```
S_rec = 0.25 × S_pred
      + 0.20 × S_stability
      + 0.25 × S_feasibility
      + 0.15 × S_physics
      + 0.15 × S_saving_magnitude
```

| Component | Definition |
|-----------|------------|
| **Prediction confidence** | S_pred from above |
| **Stability** | Top-5 candidate spread (existing Phase 29) |
| **Feasibility** | Phase 30 classification: Accepted=100, Questionable=50, Rejected=20, Impossible=0 |
| **Physics** | Penalty if POWER in decision vector; reward if only planning vars move |
| **Saving magnitude** | min(100, saving / 0.05 × 10) — marginal <0.3 min → low |

---

## Outlier Score (Phase 30 implementation)

For recipe vector **x** (planning variables only):

```
outlier_score = || z(x) ||₂ / √d
```

where z(x) is per-feature z-score vs historical training distribution.

**Phase 29.1 live heats:**

| Heat | Outlier score | Confidence | Notes |
|------|---------------|------------|-------|
| 4618204 | Highest | Low | DRI 25 t, OXY 4802 |
| 4618210–4618213 | Low–moderate | High | Normal campaign |
| 4618208 | Moderate | High | DRI 69 t high |

---

## Feature-Space Density

Count historical heats within radius r (95th percentile k-NN distance):

- **High density (>50 neighbors):** Confidence boost +10
- **Low density (<10 neighbors):** Confidence cap at Medium

Heat 4618204 expected: **<10 neighbors** in planning space.

---

## Recommendation Stability (retained from Phase 29)

Spread of HM/DRI/POWER/OXY across top-5 candidates:

- **High stability:** spread < 1.5 t / 1500 kWh
- **Low stability:** spread > 4.0 — all 7 successful live opts showed **Low** stability

**Interpretation:** Low stability is not necessarily bad — it means multiple nearby recipes achieve similar TTT. Operators should see top-5, not only rank-1.

---

## Calibration Validation Plan (Phase 31)

1. Backtest on 12,758 historical heats with actual TTT
2. Measure calibration curve: predicted tier vs |error| deciles
3. Live HMI heats: add actual TTT when available in export
4. Target: **High tier → median |error| < 4 min** (≈1.3× MAE)

---

## Immediate Actions (no production change)

| Action | Phase |
|--------|-------|
| Document POWER as non-controllable | 30 ✓ |
| Classify recommendation feasibility | 30 ✓ |
| Separate prediction vs recommendation confidence | 29 ✓ (display) |
| Implement planning-only similarity | 31 |
| Retrain without EE_KWH features | 31 |

---

*Framework proposed for Phase 31 digital twin readiness. Production confidence logic unchanged.*
