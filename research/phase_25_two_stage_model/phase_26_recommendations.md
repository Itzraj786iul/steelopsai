# Phase 26 Recommendations

## Evidence summary from Phase 25

1. **Two-stage architecture works** — overall MAE 36.4 → **16.0 min** (−56%).
2. **Normal-heat leakage-free regression is strong** — random MAE **3.28**, temporal CatBoost **3.64**.
3. **Stage 1 delay detection is weak** with current variables — abnormal recall **22–43%**.
4. **Shutdown duration is unpredictable** — classify and alert only.
5. **Missing process/event variables** are the binding constraint, not model class.

## Immediate Phase 26 actions

| Priority | Action | Expected impact |
|----------|--------|-----------------|
| P0 | Ingest **delay codes** + timestamps from MES | +delay recall, −2 min MAE potential |
| P0 | Ingest **power-on / power-off** minutes from SCADA | Separate melt time from logistics |
| P1 | Ingest **charging/crane wait** durations | Explain LONG regime heats |
| P1 | Ingest **DRI metallization %** | Improve normal MAE below 3.0 |
| P2 | Deploy two-stage API **shadow mode** next to Phase 19 | Validate without production risk |
| P2 | Retrain Phase 20 optimizer on leakage-free features | Remove EE_KWH decision variables |

## Final quantitative answers

### 1. Can Stage 1 reliably identify delay heats?
**No — not yet.** Best abnormal recall = **43.1%** (BalancedRF) at 14% precision; LightGBM (best F1) recall = **22.4%**. Missed-delay rate in pipeline = **77.6%**.

### 2. What classifier performs best?
- **Macro F1:** LightGBM, `2class_normal_vs_abnormal` (**0.613**)
- **Abnormal recall:** BalancedRandomForest (**0.431**)
- Choice depends on cost of false alarms vs missed delays.

### 3. Does separating delay heats improve regression MAE?
**Yes.**
- Mixed single model: MAE **36.43**
- Two-stage pipeline: MAE **16.04** (−20.4 min)
- Normal-only LightGBM (random): MAE **3.28**

### 4. Can leakage-free MAE go below 3.0 min?
**Not with current variables.** Best LF normal MAE = **3.28** (random) / **3.64** (temporal). Sub-3.0 requires metallization / power-on / delay filtering — not more complex ensembles (Stacking/Voting did not beat CatBoost).

### 5. What industrial variables would reduce MAE the most?
1. Delay codes / event logs (−2.0 min expected)
2. Power-on time (−1.5)
3. Charging delay / crane wait (−1.2)
4. DRI metallization (−0.8)
5. Power restriction flag (−0.6)

### 6. Can this architecture replace Phase 19?
**Not yet for production cutover.**
- Normal LF MAE (3.28–3.64) is close to Phase 19 (≈3.06) but slightly worse.
- Delay classifier is too weak for operational warnings alone.
- Recommend **shadow deployment** until abnormal recall ≥ 80% with usable precision.

### 7. Recommended production deployment architecture?

```
┌─────────────────────────────────────────────────────┐
│  Recipe lock-in (HM, DRI, scrap, flux, O₂, CPC…)   │
└─────────────────────┬───────────────────────────────┘
                      ▼
           Stage 1: LightGBM regime classifier
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
   P(NORMAL) high              P(ABNORMAL) elevated
        │                            │
        ▼                            ▼
 Stage 2: CatBoost             DELAY WARNING
 leakage-free TTT              → notify operators
 estimate (min)                → optional LONG duration
        │                      → no shutdown regression
        ▼
  Display TTT + confidence + SHAP drivers
```

Keep Phase 19 active until Stage 1 ROC / recall SLOs are met; expose Phase 25 as `/predict/v2` experimental endpoint only.

## Do NOT do next

- Do not put shutdown duration models into production.
- Do not reintroduce EE_KWH features to chase Phase 19 MAE.
- Do not retrain Phase 20/21/22 until leak-free Stage 2 is validated in shadow mode.
