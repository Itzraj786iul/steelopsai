# Component Gallery — Industrial Visualization

Open **Copilot** (`/copilot`) or **Today** (`/dashboard`) to see live examples.

## Gauges & rings

| Component | Preview context |
|-----------|-----------------|
| `IndustrialGauge` | Digital Twin — temperature, carbon, phosphorus, slag, power |
| `ConfidenceRing` | Copilot recommendation card — SIFM confidence % |
| `HeatHealthRing` | Live heat workspace (alias of ConfidenceRing) |

## Prediction

| Component | Preview context |
|-----------|-----------------|
| `PredictionBand` | Copilot — predicted AT with 95% band and target marker |
| `TwinComparison` | Digital Twin — baseline vs simulated optimized |
| `SavingsWaterfall` | Copilot business impact + dashboard executive row |

## Process & flow

| Component | Preview context |
|-----------|-----------------|
| `AnimatedPipeline` | Digital Twin header — Raw Materials → Caster |
| `ProcessFlow` | Furnace cross-section — Charging → Tapping |
| `RecommendationFlow` | Copilot — recipe → analysis → twin → approval |
| `OperatorActionTimeline` | Copilot intervention steps |
| `ExecutionTimeline` | Copilot workspace header — Prediction → Learning |

## Recipe

| Component | Preview context |
|-----------|-----------------|
| `RecipeRadar` | Copilot material deltas section |
| `RecipeDelta` | Bidirectional delta bars per variable |
| `SavingsWaterfall` | Minutes + INR waterfall |

## Reasoning & similarity

| Component | Preview context |
|-----------|-----------------|
| `SHAPWaterfall` | Copilot recommendation — horizontal bar chart |
| `ReasoningFlow` | Variable → mechanism → stage → impact → action |
| `HeatFingerprint` | Current heat orbited by similar historical heats |

## Furnace / twin

| Component | Preview context |
|-----------|-----------------|
| `FurnaceCrossSection` | SVG furnace + stage list + live gauges |
| `TwinPlayback` | Scrubber for baseline → optimized interpolation |
| `EnergyFlow` | Power, oxygen, GREEN bars |

## Executive (dashboard)

| Component | Preview context |
|-----------|-----------------|
| `HeatFunnel` | Scheduled → AI ready → approvals |
| `TrendRiver` | Recoverable minutes sparkline |
| `RiskMatrix` | Copilot feasibility warnings |

## Usage

```tsx
import { PredictionBand, SHAPWaterfall, RecommendationFlow } from "@/components/industrial";
```

See `visualization_catalog.csv` for full inventory.
