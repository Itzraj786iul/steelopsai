# Phase 31 — Industrial Recipe Optimizer V2

**Research-only** implementation. Production Phase 19 model and Phase 20.2 optimizer are **unchanged**.

## Objective

Planning-stage optimizer that:
- Never optimizes Electrical Energy (EE_KWH), final OXY/CPC totals, or TTT
- Uses frozen Phase 19 model for evaluation only (POWER held at current heat value)
- Applies physics + industrial rule engines
- Returns top 5 ranked, explainable alternatives

## Modules

| File | Purpose |
|------|---------|
| `experimental_optimizer_v2.py` | Main optimizer V2 |
| `physics_constraints.py` | R1–R10 constraint checks |
| `industrial_rules.py` | Rule traces with Satisfied/Violated |
| `multi_objective_scoring.py` | Weighted multi-objective function |
| `explanation_engine.py` | Metallurgical explanation chains |
| `phase31_config.py` | Constants and paths |
| `phase_31_pipeline.py` | Validation vs Phase 20.2, sensitivity, robustness |

## Run

```bash
cd research/phase_31_optimizer_v2
python phase_31_pipeline.py
python finish_phase_31.py   # if plots needed after comparison
```

## Live Heat Comparison Summary (Phase 29 HMI)

| Result | Count |
|--------|-------|
| V2 feasibility wins vs V20 | **9/10** |
| V2 optimizes POWER | **0/10** (always fixed) |
| Phase 20.2 rejected (POWER change) | **7/7** successful V20 runs |
| V2 succeeds where V20 failed | **4618211, 4618210** |
| Both fail | **4618204** (outlier heat) |

## Success Criteria

| Criterion | Status |
|-----------|--------|
| EE_KWH removed from decision vector | ✓ |
| Planning controllables only | ✓ |
| Physics + industrial rules | ✓ |
| Top 5 ranked alternatives | ✓ |
| Explanation V2 with literature | ✓ |
| Comparison vs Phase 20.2 | ✓ |
| Production unchanged | ✓ |

See `phase_32_recommendations.md` for next steps.
