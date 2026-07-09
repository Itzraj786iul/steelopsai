# Recommendation Explanation Templates — Phase 30

**Purpose:** Replace terse optimizer deltas with metallurgical causal chains operators can trust.

---

## Template Structure

```
[Variable change with magnitude]
        ↓
[Process mechanism]
        ↓
[Secondary effect]
        ↓
[Expected TTT impact]
        ↓
Predicted saving: X.X minutes
Confidence: High | Medium | Low
Supporting historical heats: [IDs]
```

---

## Template 1 — HM Reduction with DRI Compensation

**Trigger:** HM ↓ and DRI ↑ in same recommendation

```
HM reduced by {hm_delta:.1f} t
        ↓
Solid DRI burden increased while total metallic charge held near {charge:.0f} t
        ↓
Liquid metal share decreases — arcing duty shifts toward solid melting
        ↓
Melting path changes; refining window may shorten if slag practice unchanged
        ↓
Predicted saving: {saving:.1f} minutes
Confidence: {confidence}
Supporting historical heats: {heat_list}
```

**Example (Heat 4618213):**
> HM reduced by 1.1 t → Solid burden increased via DRI +2.7 t while charge held at 132 t → Burden balance maintained per JSPL HM–DRI coupling → Predicted saving 0.54 min. Confidence: Medium. Supporting heats: 4517263, 4515148.

---

## Template 2 — Electrical Energy (INCORRECT recommendation — flag)

**Trigger:** POWER change in Phase 20.2 output

```
⚠ NON-CONTROLLABLE OUTCOME
Electrical Energy shown as {power_delta:+.0f} kWh
        ↓
This is EE_KWH (post-heat total), not an operator setpoint
        ↓
Real levers: burden mix, tap setting, restriction compliance, power-on practice
        ↓
Recommendation status: REJECTED for planning use
Confidence: N/A — redesign required (Phase 31)
```

---

## Template 3 — Oxygen Program Adjustment

**Trigger:** OXY change < 5%

```
Oxygen program adjusted by {oxy_delta:+.0f} Nm³ ({oxy_pct:+.1f}%)
        ↓
Refining intensity changes decarburization and slag FeO removal rate
        ↓
Minor trim within historical P5–P95 band
        ↓
Predicted saving: {saving:.1f} minutes
Confidence: {confidence}
```

---

## Template 4 — Flux Optimization

**Trigger:** LIME or DOLO change

```
Lime adjusted by {lime_delta:+.2f} t
        ↓
Slag basicity and volume shift
        ↓
Excess lime extends slag handling; reduction may shorten refining if basicity remains safe
        ↓
Predicted saving: {saving:.1f} minutes
Confidence: {confidence}
Industrial note: Flux changes require quality desk approval at JSPL
```

---

## Template 5 — Scrap Bucket Reduction

**Trigger:** Bucket ↓

```
Scrap bucket reduced by {bucket_delta:.1f} t
        ↓
Cold charge load decreases
        ↓
Less electrical energy required for solid melting (informational — not a kWh setpoint)
        ↓
Arc utilization improves when metallic structure is more uniform
        ↓
Predicted saving: {saving:.1f} minutes
Confidence: {confidence}
```

---

## Template 6 — Optimizer Failure

**Trigger:** No valid candidates

```
No feasible recipe improvement found
        ↓
Current operating point is at or beyond physics/historical boundary
        ↓
Likely causes: {cause_list}
        ↓
Operator action: Hold current practice; review on floor before forcing changes
Recommendation: Do not apply mathematical optimum — none exists in feasible region
```

**Example (Heat 4618210):** CPC 270 kg (extreme low) + Power 39,332 kWh at P95 → search failure.

---

## Template 7 — High-DRI Campaign

**Trigger:** DRI > 67 t (above P95)

```
High DRI level ({dri:.1f} t) — above historical P95
        ↓
Increased solid melting load and carbon/oxygen demand
        ↓
Optimizer must not simultaneously recommend large power reduction
        ↓
Predicted TTT already elevated ({pred:.1f} min)
Confidence: Medium — monitor on floor
```

---

## Classification Mapping

| Feasibility class | Template | Operator message |
|-------------------|----------|------------------|
| Accepted | 1, 3, 4, 5 | Safe to review on floor |
| Questionable | 3, 4 with Large severity | Requires shift leader approval |
| Rejected | 2 | Do not implement POWER delta |
| Impossible | 6 | Optimizer could not run |

---

*Templates for Phase 31 explanation engine integration. Production API unchanged.*
