# Executive Command Center — Sprint 4

**Route:** `/executive`  
**Audience:** Plant Head, CEO, Board

## 30-second story

1. **Financial strip** — savings, minutes, achievement, adoption, accuracy, health, CO₂, power, oxygen, GREEN
2. **Story panels** — AI saved ₹X → equivalent heats/month
3. **Narrative** — readable bullets (risks prevented, shift leader, efficiency)
4. **Plant map** — EAF-1/2/3 status, health, risk, current heat, savings
5. **ROI** — investment, payback, annual ROI

## Data sources (unchanged APIs)

| Metric | Source |
|--------|--------|
| Heats today | `plantApi.scheduling(shift)` |
| Savings / minutes | `usePreheatStore().activePackage` |
| Approvals risk | `agentsApi.approvals(PENDING)` |
| Trends / operators / shifts | Client projections from snapshot (no new API) |

## Board presentation mode

- Fullscreen via browser API
- Auto-scroll for leadership walkthrough
- Print-friendly for PDF export

## Components

```
features/executive/
├── utils/executive-metrics.ts
└── components/
    ├── executive-command-center.tsx
    ├── financial-story-strip.tsx
    ├── executive-story.tsx
    ├── plant-overview-map.tsx
    ├── executive-charts.tsx
    ├── executive-intelligence.tsx
    ├── ai-roi-dashboard.tsx
    ├── board-presentation-mode.tsx
    └── export-center.tsx
```

## Design principles

- Story before charts
- Every viz supports a decision
- No fake backend — snapshot JSON export uses live derived metrics
