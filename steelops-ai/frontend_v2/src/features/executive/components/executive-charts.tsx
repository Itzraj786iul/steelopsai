"use client";

import { memo, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { CostBreakdown, SavingsWaterfall } from "@/components/industrial";
import { VizPanel } from "@/components/industrial/primitives";
import { INDUSTRIAL_CHART, industrialAxisProps, industrialGridProps, industrialTooltipStyle } from "@/components/industrial/chart-theme";
import type { ExecutiveSnapshot } from "@/features/executive/utils/executive-metrics";
import { trendSeries } from "@/features/executive/utils/executive-metrics";
import { formatCurrency } from "@/lib/utils";

const TrendChart = dynamic(
  () =>
    import("recharts").then((m) => {
      const { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } = m;
      return function Chart({ data }: { data: Array<Record<string, number | string>> }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid {...industrialGridProps} />
              <XAxis dataKey="label" {...industrialAxisProps} />
              <YAxis {...industrialAxisProps} />
              <Tooltip contentStyle={industrialTooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="heatTime" name="Heat time" stroke={INDUSTRIAL_CHART.primary} dot={false} />
              <Line type="monotone" dataKey="accuracy" name="Accuracy %" stroke={INDUSTRIAL_CHART.accent} dot={false} />
              <Line type="monotone" dataKey="adoption" name="AI adoption %" stroke={INDUSTRIAL_CHART.prediction} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-56 shimmer rounded-xl" /> }
);

const ParetoChart = dynamic(
  () =>
    import("recharts").then((m) => {
      const { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } = m;
      return function Chart({ data }: { data: Array<{ cause: string; count: number }> }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid {...industrialGridProps} />
              <XAxis type="number" {...industrialAxisProps} />
              <YAxis type="category" dataKey="cause" width={100} {...industrialAxisProps} />
              <Tooltip contentStyle={industrialTooltipStyle} />
              <Bar dataKey="count" fill={INDUSTRIAL_CHART.warning} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-48 shimmer rounded-xl" /> }
);

interface FinancialDashboardProps {
  snapshot: ExecutiveSnapshot;
}

export const FinancialDashboard = memo(function FinancialDashboard({ snapshot }: FinancialDashboardProps) {
  const baseline = snapshot.heatAverageMin + 1.2;
  const optimized = snapshot.heatAverageMin - snapshot.minutesSaved / Math.max(snapshot.totalHeats, 1);

  const costItems = useMemo(
    () => [
      { label: "Power cost avoided", value: snapshot.powerSavedMwh * 8500 },
      { label: "Oxygen cost avoided", value: snapshot.oxygenSavedNm3 * 12 },
      { label: "Material efficiency", value: snapshot.savingsInr * 0.35 },
      { label: "Lost opportunity", value: snapshot.pendingApprovals * 42000 },
      { label: "Recovered opportunity", value: snapshot.savingsInr },
    ],
    [snapshot]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <VizPanel title="Savings waterfall" description="Baseline to target heat time">
        <SavingsWaterfall baselineMinutes={baseline} optimizedMinutes={optimized} businessValueInr={snapshot.savingsInr} />
      </VizPanel>
      <VizPanel title="Cost breakdown" description="Where value is created and lost">
        <CostBreakdown items={costItems} />
      </VizPanel>
    </div>
  );
});

export const PerformanceTrends = memo(function PerformanceTrends({ snapshot }: { snapshot: ExecutiveSnapshot }) {
  const [range, setRange] = useState("7d");
  const points = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 12 : 12;

  const data = useMemo(() => {
    const heat = trendSeries(snapshot.heatAverageMin, points);
    const acc = trendSeries(snapshot.predictionAccuracyPct, points, 0.02);
    const adp = trendSeries(snapshot.aiAdoptionPct, points, 0.03);
    return heat.map((h, i) => ({
      label: range === "year" ? `M${i + 1}` : `D${i + 1}`,
      heatTime: Number(h.toFixed(1)),
      accuracy: Number(acc[i].toFixed(1)),
      adoption: Number(adp[i].toFixed(1)),
    }));
  }, [snapshot, points, range]);

  const ranges = [
    { id: "7d", label: "7 days" },
    { id: "30d", label: "30 days" },
    { id: "90d", label: "90 days" },
    { id: "year", label: "Year" },
  ] as const;

  return (
    <VizPanel title="Performance trends">
      <div className="mb-4 inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground">
        {ranges.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
              range === item.id ? "bg-background text-foreground shadow-sm" : "hover:text-foreground"
            )}
            onClick={() => setRange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="h-56">
        <TrendChart data={data} />
      </div>
    </VizPanel>
  );
});

export const RootCausePareto = memo(function RootCausePareto({
  items,
}: {
  items: Array<{ cause: string; count: number; impactInr: number }>;
}) {
  return (
    <VizPanel title="Root cause dashboard" description="Top recurring causes — Pareto view">
      <div className="h-52">
        <ParetoChart data={items} />
      </div>
      <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.cause} className="flex justify-between">
            <span>{item.cause}</span>
            <span className="font-mono">{formatCurrency(item.impactInr)} at risk</span>
          </li>
        ))}
      </ul>
    </VizPanel>
  );
});
