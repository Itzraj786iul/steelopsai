# Phase 28 Recommendations
## JSPL Management Brief — Industrial Data Gap Analysis (Phase 27)

**Status:** Production Phases 19–22 and research Phases 25–26 remain **frozen**.  
**Finding:** Algorithmic remixing of existing columns has hit an **information ceiling** (Phase 26 ΔMAE ≈ **−0.04 min** only).

---

## Executive answers

### 1. What is the single biggest missing variable?
**Delay codes / event logs** (coupled with power-off time).  
Evidence: ~5% abnormal heats drive plant-level MAE from ~3 min to ~16–36 min; Stage-1 abnormal recall today is only **~22%** because charge recipes cannot see logistics/equipment events (Phase 25).

### 2. Which five variables should JSPL start recording immediately?
| # | Variable | Est. MAE gain | Effort |
|---|----------|---------------|--------|
| 1 | Delay codes + timestamps | ~2.0 min (esp. plant/abnormal path) | Low–Medium |
| 2 | Power-on time | ~1.5 min | Medium |
| 3 | Power-off / charging–crane waits | ~1.0–1.2 min | Low–Medium |
| 4 | Power restriction flag | ~0.6 min | Low |
| 5 | DRI metallization % | ~0.8 min | Medium |

### 3. How much MAE reduction is realistically possible?
| Scope | Today | After P0 (realistic) | After P0+P1 |
|-------|-------|----------------------|-------------|
| Normal heats (LF) | ~3.24–3.28 min | **~2.3–2.7 min** | **~2.0–2.4 min** |
| Full plant (two-stage) | ~16 min | Large drop via delay detection | Further with live twin |

Gains are **not fully additive**; plan portfolios at ~40–60% of summed literature estimates.

### 4. Can MAE below 2.5 minutes be achieved?
**Yes, on normal heats**, if P0 (+ preferably P1 metallization / HM temperature) are instrumented and two-stage architecture is retained.  
**Unlikely** with the current dataset alone (Phase 26 ceiling).  
**Sub-2.0 min** is aspirational and needs high-quality live SCADA + quality labs (V3).

### 5. Roadmap: today's model → plant-wide digital twin
```
V1 Current (frozen Phase 19 + experimental 25/26)
 → V2 Planning + SCADA/MES P0–P1 tags
 → V3 Real-time twin (live residual + delay warning)
 → V4 Closed-loop recipe recommendation (human confirm)
```
Data path: PLC → SCADA → Historian → MES → Feature store → AI services → Dashboard / Optimizer.

### 6. Next 12 months
1. Implement **P0 measurement package** (delays, power-on/off, waits, restriction).
2. **Shadow-deploy** Phase 25 two-stage + Phase 26 gold features; keep Phase 19 production.
3. Resolve **OXY/CPC timing** semantics with operations.
4. Publish monthly KPIs: normal MAE, delay recall, false alarms.
5. Start DRI lab metallization data pipeline design (P1).

### 7. Next 3 years
1. Year 1–2: P1 quality & injection profiles; Stage-1 recall **>80%**.
2. Year 2–3: V3 digital twin + operator cockpit.
3. Year 3: V4 constrained optimizer; EE_KWH only as **outcome KPI**, never free decision variable.
4. Academic programme: dynamic TTT, causal delay models, physics-informed foam/energy, safe RL sandbox.

---

## Priority table (top estimates)

| Variable                         |   Expected_MAE_improvement_min | Implementation_effort   | Priority   |
|:---------------------------------|-------------------------------:|:------------------------|:-----------|
| Delay codes                      |                            2   | Low–Medium              | P0         |
| Power-on time                    |                            1.5 | Medium                  | P0         |
| Power-off time                   |                            1.2 | Medium                  | P0         |
| Charging / crane wait timestamps |                            1   | Low–Medium              | P0         |
| DRI metallization %              |                            0.8 | Medium                  | P1         |

## What NOT to do
- Do not chase MAE with more derived ratios on the current columns.
- Do not reintroduce EE_KWH features into planning models.
- Do not cut over production until delay warning SLOs are met in shadow mode.
- Do not regress shutdown durations — classify and alert only.

## Phase 28 research focus
**Instrument → validate → twin**, not retrain-only. First engineering milestone: P0 data contracts with MES/SCADA owners and a shadow `/predict/v2` endpoint consuming new tags when available.
