# Phase 32 — Hybrid Physics + AI Decision Engine

**Research only.** Production (Phase 19, 20.2, 31 V2, backend, frontend) unchanged.

## Concept

Instead of `Score = Predicted TTT` alone:

```
Hybrid Score = Prediction + Physics + Industrial Rules + Historical Similarity + Risk + Operator Preference
```

**Reliability Index (0–100)** = final operator trust score combining AI, physics, industrial confidence, agreement, and stability.

## Modules

| File | Purpose |
|------|---------|
| `hybrid_decision_engine.py` | Main engine — orchestrates V2 + confidence + agreement |
| `confidence_engine.py` | Physics / AI / Industrial confidence |
| `agreement_engine.py` | Physics vs ML vs Historical vs Operator agreement |
| `reliability_engine.py` | Reliability Index |
| `recommendation_consensus.py` | Strong / Moderate / Weak / Conflict |
| `scenario_simulator.py` | Operator override what-if scenarios |
| `phase_32_pipeline.py` | A/B evaluation + deliverables |

## Run

```bash
cd research/phase_32_hybrid_decision_engine
python phase_32_pipeline.py
```

## Deliverables

- `hybrid_comparison.csv`, `confidence_scores.csv`, `hybrid_ab_evaluation.csv`
- `operator_scenarios.xlsx`, `recommendation_reliability.xlsx`, `digital_twin_readiness.xlsx`
- `phase_33_recommendations.md`
- `plots/*.png`
