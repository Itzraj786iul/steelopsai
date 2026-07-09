# Optimizer Variable Review — Phase 30 Scientific Redesign

**Status:** Research / experimental  
**Production frozen:** Phase 20.2 `CONTROLLABLE_NUMERIC` unchanged  
**Date:** 2026-07-09

---

## Executive Finding

The Phase 20.2 optimizer treats **Electrical Energy (kWh)** as a free decision variable alongside burden and flux inputs. JSPL has confirmed that `POWER` in the dataset is **EE_KWH** — a post-heat meter totalizer. Operators cannot set kWh before melting; they set **burden, flux programs, oxygen/carbon targets, transformer tap, and power restriction compliance**. Energy is an **outcome** of arcing time, arc stability, and restrictions.

**Phase 30 conclusion:** Remove `POWER` from the optimizer decision vector. Redesign around planning-time controllables only.

---

## Current Optimizer (Phase 20.2) — Incorrect Decision Vector

```python
CONTROLLABLE_NUMERIC = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]
```

| Variable | Optimized today? | Scientifically correct? | Issue |
|----------|------------------|-------------------------|-------|
| HM | Yes | Yes | Coupled with DRI — must move jointly |
| DRI | Yes | Yes | Same |
| HBI | Yes | Conditional | Sparse at JSPL |
| Bucket | Yes | Yes | Scrap availability constraint needed |
| LIME | Yes | Yes | Flux program |
| DOLO | Yes | Yes | Flux program |
| CPC | Yes | Partial | Should be **Target Carbon Program**, not final kg |
| OXY | Yes | Partial | Should be **Target Oxygen Program**, not final Nm³ |
| **POWER** | **Yes** | **NO** | **Outcome variable — remove** |
| Shift | Fixed | Context only | Not optimized |
| Power_Restriction | API only | **Hard constraint** | Not in Phase 20 search space |

### Evidence from Phase 29.1 live validation

- **7/7 successful optimizations** reduced electrical energy by 368–1,712 kWh (~1–5%).
- All flagged **"Physics X (lower power slows melting)"** or **"Review physics"**.
- Operators cannot implement "reduce POWER to 32,704 kWh" as a recipe — they implement burden/flux/lance programs; kWh follows.

---

## Proposed Phase 30 Decision Vector (Experimental)

### Primary planning variables

| Variable | Role | Units | Notes |
|----------|------|-------|-------|
| HM | Burden | t | Semi-controllable; coupled with DRI |
| DRI | Burden | t | |
| HBI | Burden | t | When used |
| Bucket | Burden | t | Scrap bucket |
| LIME | Flux | t | Slag basicity |
| DOLO | Flux | t | MgO / refractory |
| Target Oxygen Program | Process setpoint | Nm³ target | Not final total |
| Target Carbon Program | Process setpoint | kg CPC target | Not final total |
| Power Restriction | Constraint | 0/1 | Hard cap on tap / practice |
| Transformer Tap | Equipment | tap # | If SCADA available (Phase 31) |

### Removed from decision vector

| Variable | Treatment |
|----------|-----------|
| POWER (EE_KWH) | **Outcome** — predict after simulation, never optimize |
| OXY (as final total) | Replace with program target |
| CPC (as final total) | Replace with program target |

### Constraints (not decision variables)

- Total charge band (JSPL practice: historically 115–150 t; live HMI includes 90–132 t advisory)
- HM + DRI anti-correlation (existing Phase 20 physics)
- Power restriction compliance
- Historical P5–P95 soft penalties on **planning** variables only
- Lime/dolomite ratio bounds

---

## Outcome Variables (predict, do not optimize)

| Variable | When measured | Use in Phase 30 experimental stack |
|----------|---------------|-----------------------------------|
| EE_KWH (POWER) | After tap | Predicted from melting/refining model |
| Final OXY / CPC totals | After heat | Validation metrics |
| TTT | After tap | Primary objective |
| Power-on time | During heat | Missing — Phase 31 |
| Delays | During heat | Missing — Phase 31 |

---

## Recommended Optimizer Architecture (Phase 31 preview)

```
Planning inputs (HM, DRI, Bucket, flux, O₂/C targets, restriction)
        ↓
Physics + metallurgy constraints
        ↓
Phase 19 planning-safe model (no EE_KWH leakage features)
        ↓
Predicted TTT + predicted energy band (informational)
        ↓
Operator-facing recommendation (burden + programs only)
```

---

## Migration Path

1. **Phase 30 (this phase):** Document, validate failures, classify feasibility — no production change.
2. **Phase 31:** Implement `experimental_optimizer_v2.py` in research folder only.
3. **Phase 31+:** Retrain or wrap model with planning-safe feature set (Phase 24 leakage-free features).
4. **Production promotion:** Only after live validation with actual TTT for HMI heats.

---

## References

- Phase 23.5 leakage report — EE_KWH temporal leakage CRITICAL
- Phase 27 variable inventory — POWER flagged LEAKAGE
- Phase 29.1 live validation — power reductions in 100% of successful opts
- Kirschen et al. (2011) — EAF mass and energy balance
- Knutsen et al. (2020) — TTT sub-stages and energy
- JSPL operator confirmation — EE_KWH post-process only
