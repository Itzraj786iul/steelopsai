"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

import { ChartSkeleton } from "@/components/feedback/loading-skeleton";
import {
  AnimatedPipeline,
  EnergyFlow,
  FurnaceCrossSection,
  TwinComparison,
  TwinPlayback,
  resolveStageIndex,
} from "@/components/industrial";
import { VizPanel } from "@/components/industrial/primitives";
import { PortfolioSelector } from "@/features/copilot/components/portfolio-selector";
import { buildComparisonChartData, interpolateTwinValue } from "@/features/copilot/utils/copilot-utils";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PortfolioSlot } from "@/stores/copilot-store";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

const ComparisonBarChart = dynamic(
  () => import("@/features/preheat/components/comparison-chart").then((m) => m.ComparisonBarChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface DigitalTwinPlayerProps {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
  simulationProgress: number;
  selectedPortfolio: PortfolioSlot;
  onPortfolioChange: (slot: PortfolioSlot) => void;
  onSimulationChange: (value: number) => void;
}

export const DigitalTwinPlayer = memo(function DigitalTwinPlayer({
  pkg,
  portfolio,
  simulationProgress,
  selectedPortfolio,
  onPortfolioChange,
  onSimulationChange,
}: DigitalTwinPlayerProps) {
  const twin = pkg.digital_twin_comparison;
  const baselineAt = twin.baseline_heat_time_min ?? portfolio.predictedAt;
  const optimizedAt = twin.optimized_heat_time_min ?? portfolio.targetAt;
  const baselinePower = twin.baseline_POWER_kWh ?? portfolio.power;
  const optimizedPower = twin.optimized_POWER_kWh ?? portfolio.power;
  const baselineGreen = twin.baseline_GREEN_pct ?? portfolio.greenPct;
  const optimizedGreen = twin.optimized_GREEN_pct ?? portfolio.greenPct;

  const simulatedAt = interpolateTwinValue(baselineAt, optimizedAt, simulationProgress);
  const simulatedPower = interpolateTwinValue(baselinePower, optimizedPower, simulationProgress);
  const simulatedGreen = interpolateTwinValue(baselineGreen, optimizedGreen, simulationProgress);
  const stage = twin.optimized_dominant_stage ?? twin.baseline_dominant_stage ?? "melt";
  const stageIndex = resolveStageIndex(stage);

  const chartData = useMemo(
    () =>
      buildComparisonChartData(
        pkg.planned_recipe,
        portfolio.recipe,
        portfolio.predictedAt,
        portfolio.targetAt,
        baselineGreen,
        optimizedGreen,
        baselinePower,
        optimizedPower
      ),
    [pkg.planned_recipe, portfolio, baselineGreen, optimizedGreen, baselinePower, optimizedPower]
  );

  return (
    <motion.aside
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-elevation-sm"
    >
      <div className="border-b border-border/70 px-5 py-4">
        <p className="text-label">Digital twin</p>
        <h2 className="text-heading-md">Simulation replay</h2>
      </div>

      <div className="max-h-[calc(100vh-12rem)] space-y-4 overflow-y-auto p-4 scrollbar-thin">
        <PortfolioSelector selected={selectedPortfolio} onChange={onPortfolioChange} />

        <AnimatedPipeline activeIndex={Math.min(stageIndex + 2, 5)} />

        <FurnaceCrossSection
          activeStage={stage}
          progress={simulationProgress}
          temperature={1650 - simulationProgress * 80}
          carbon={0.08 - simulationProgress * 0.02}
          phosphorus={0.035 - simulationProgress * 0.005}
          slag={14 - simulationProgress * 2}
          power={(simulatedPower / baselinePower) * 100}
        />

        <TwinPlayback progress={simulationProgress} onChange={onSimulationChange} />

        <TwinComparison baseline={baselineAt} optimized={simulatedAt} label="Heat time (simulated)" />

        <EnergyFlow powerKwh={simulatedPower} oxygen={pkg.expected_OXY} greenPct={simulatedGreen} />

        <VizPanel title="Stage shift" className="!p-3">
          <p className="text-sm">
            {twin.baseline_dominant_stage ?? "melt"} → {twin.optimized_dominant_stage ?? "refine"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{twin.stage_explanation ?? twin.recommendation}</p>
        </VizPanel>

        <ComparisonBarChart data={chartData} />
      </div>
    </motion.aside>
  );
});
