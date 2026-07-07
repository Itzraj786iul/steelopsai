# Industrial Visualization System — Sprint 2

SteelOps AI transforms operational numbers into **actionable industrial intelligence**.

## Design principles

1. **Action-first** — every chart answers "What should I do?"
2. **Risk & confidence visible** — bands, rings, matrices—not footnotes
3. **Process context** — furnace stage, plant pipeline, execution path
4. **Dark industrial palette** — Recharts + CSS tokens from Design System v3
5. **Accessible** — `role`, `aria-label`, `sr-only` summaries, colorblind-safe pairs
6. **Performant** — `memo`, dynamic import for Recharts, 150–250ms motion

## Architecture

```
src/components/industrial/
├── chart-theme.ts      # Recharts colors, tooltip, axis
├── types.ts            # FlowStep, ShapDriver, SimilarHeatNode
├── primitives.tsx      # VizPanel, IndustrialLegend
├── gauges.tsx          # IndustrialGauge, ConfidenceRing, HeatHealthRing
├── prediction.tsx      # PredictionBand, TwinComparison, PredictionDrift
├── process-flow.tsx      # ProcessFlow, AnimatedPipeline, ExecutionTimeline
├── furnace.tsx         # FurnaceCrossSection, TwinPlayback
├── material-energy.tsx # MaterialFlow, EnergyFlow, CarbonFlow, SlagFlow
├── recipe-viz.tsx      # RecipeRadar, RecipeDelta, SavingsWaterfall
├── reasoning-viz.tsx   # SHAPWaterfall, ReasoningFlow, HeatFingerprint
└── index.ts            # barrel export
```

## Copilot integration

| Former (text/table) | Now (visual) |
|---------------------|--------------|
| SHAP bullet list | `SHAPWaterfall` |
| Metric grid | `PredictionBand` + `ConfidenceRing` |
| Recipe table | `RecipeRadar` + `RecipeDelta` |
| Business impact text | `SavingsWaterfall` |
| Operator list | `OperatorActionTimeline` |
| Root cause paragraph | `ReasoningFlow` chain |
| Learning list | `HeatFingerprint` |
| — | `RecommendationFlow` decision pipeline |
| Twin sidebar | `FurnaceCrossSection` + `AnimatedPipeline` + `EnergyFlow` |

## Chart standardization

All Recharts in `comparison-chart.tsx` use:

- `INDUSTRIAL_CHART` color tokens
- `industrialTooltipStyle`
- `industrialAxisProps` / `industrialGridProps`
- `isAnimationActive` on bars/radar

## Helper layer

`features/copilot/utils/copilot-viz-helpers.ts` maps `PreheatDecisionPackage` → visualization props without API changes.

## Accessibility checklist

- [x] `role="img"` / `role="meter"` on gauges
- [x] `aria-label` on flow diagrams
- [x] `sr-only` summaries in `VizPanel`
- [x] Focus rings on interactive fingerprint nodes
- [x] Colorblind-safe blue/orange/green palette

## Performance

- Dynamic `import()` for radar/waterfall/SHAP Recharts
- All exported components wrapped in `memo`
- Copilot loaded state split to satisfy Rules of Hooks

## Quality gate

```bash
cd frontend_v2
npm run lint
npx tsc --noEmit
npm test
```
