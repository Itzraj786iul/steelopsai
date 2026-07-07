"use client";

import { memo, useMemo } from "react";

import { ComparisonBarChart, TimelineComparisonChart } from "@/features/preheat/components/comparison-chart";
import { buildComparisonChartData, interpolateTwinValue } from "@/features/copilot/utils/copilot-utils";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

interface TwinChartsProps {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
  simulationProgress: number;
}

export const TwinCharts = memo(function TwinCharts({ pkg, portfolio, simulationProgress }: TwinChartsProps) {
  const twin = pkg.digital_twin_comparison;
  const baselineAt = twin.baseline_heat_time_min ?? portfolio.predictedAt;
  const optimizedAt = twin.optimized_heat_time_min ?? portfolio.targetAt;
  const baselinePower = twin.baseline_POWER_kWh ?? portfolio.power;
  const optimizedPower = twin.optimized_POWER_kWh ?? portfolio.power;
  const baselineGreen = twin.baseline_GREEN_pct ?? portfolio.greenPct;
  const optimizedGreen = twin.optimized_GREEN_pct ?? portfolio.greenPct;

  const simulatedAt = interpolateTwinValue(baselineAt, optimizedAt, simulationProgress);

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
    <div className="grid gap-4 xl:grid-cols-2">
      <ComparisonBarChart data={chartData} />
      <TimelineComparisonChart baseline={baselineAt} optimized={simulatedAt} />
    </div>
  );
});
