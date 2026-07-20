# Phase 46 Findings

## Similar-heat search
Planning-weighted + outcome re-rank produces neighbours that operators can actually compare on burden mix, not just EE similarity. Composite similarity separates **recipe match** from **outcome match** (Phase 30 lesson).

## Predictor
Neighbour-informed CI is the safe accuracy UX win without pickle swap. Random-split gains from Phases 42–45 still fail temporal gates — keep P19.

## Optimizer
Freezing POWER removes the shop-rejected energy-cut recommendations while still allowing burden/flux/O₂ local search. Historical similarity index now matches planning distance used in explainability.

## Production stance
| Component | Authority | Change |
|-----------|-----------|--------|
| TTT model | Phase 19 | CI + neighbour advisory only |
| Optimizer | Phase 20.2 engine | `power_pct=0` |
| Similar heats | Explainability layer | Weighted + outcome-aware |
