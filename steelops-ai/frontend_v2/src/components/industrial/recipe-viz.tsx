"use client";

import { memo, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART, industrialAxisProps, industrialGridProps, industrialTooltipStyle } from "./chart-theme";
import { IndustrialLegend } from "./primitives";
import type { RecipeDeltaRow } from "./types";
import { formatCurrency } from "@/lib/utils";

const RadarChartLazy = dynamic(
  () =>
    import("recharts").then((m) => {
      const { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } = m;
      return function RecipeRadarChart({
        data,
      }: {
        data: Array<{ metric: string; current: number; optimized: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data}>
              <PolarGrid stroke={INDUSTRIAL_CHART.grid} />
              <PolarAngleAxis dataKey="metric" {...industrialAxisProps} />
              <PolarRadiusAxis {...industrialAxisProps} />
              <Radar name="Planned" dataKey="current" stroke={INDUSTRIAL_CHART.secondary} fill={INDUSTRIAL_CHART.secondary} fillOpacity={0.2} />
              <Radar name="Recommended" dataKey="optimized" stroke={INDUSTRIAL_CHART.primary} fill={INDUSTRIAL_CHART.primary} fillOpacity={0.25} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-56 shimmer rounded-xl" /> }
);

const WaterfallLazy = dynamic(
  () =>
    import("recharts").then((m) => {
      const { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } = m;
      return function WaterfallChart({ data }: { data: Array<{ name: string; value: number; fill: string }> }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...industrialGridProps} />
              <XAxis dataKey="name" {...industrialAxisProps} />
              <YAxis {...industrialAxisProps} />
              <Tooltip contentStyle={industrialTooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-48 shimmer rounded-xl" /> }
);

interface RecipeRadarProps {
  data: Array<{ metric: string; current: number; optimized: number }>;
  className?: string;
}

export const RecipeRadar = memo(function RecipeRadar({ data, className }: RecipeRadarProps) {
  return (
    <div className={cn("h-56", className)} role="img" aria-label="Recipe radar comparison">
      <RadarChartLazy data={data} />
      <IndustrialLegend
        className="mt-2 justify-center"
        items={[
          { label: "Planned", color: INDUSTRIAL_CHART.secondary },
          { label: "Recommended", color: INDUSTRIAL_CHART.primary },
        ]}
      />
    </div>
  );
});

interface RecipeDeltaVizProps {
  deltas: RecipeDeltaRow[];
  className?: string;
}

export const RecipeDelta = memo(function RecipeDelta({ deltas, className }: RecipeDeltaVizProps) {
  const maxDelta = Math.max(...deltas.map((d) => Math.abs(d.delta)), 1);
  return (
    <div className={cn("space-y-3", className)} role="img" aria-label="Recipe material deltas">
      {deltas.map((row, i) => (
        <motion.div key={row.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-medium">{row.key}</span>
            <span className="font-mono text-muted-foreground">
              {row.baseline.toFixed(1)} → {row.candidate.toFixed(1)}
            </span>
          </div>
          <div className="relative h-3 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute top-0 h-full rounded-full"
              style={{
                backgroundColor: row.delta < 0 ? INDUSTRIAL_CHART.accent : row.delta > 0 ? INDUSTRIAL_CHART.warning : INDUSTRIAL_CHART.muted,
                left: row.delta >= 0 ? "50%" : undefined,
                right: row.delta < 0 ? "50%" : undefined,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${(Math.abs(row.delta) / maxDelta) * 50}%` }}
            />
            <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
          </div>
          <p className={cn("mt-0.5 text-right font-mono text-xs", row.delta < 0 ? "text-accent" : row.delta > 0 ? "text-warning" : "")}>
            {row.delta > 0 ? "+" : ""}
            {row.delta.toFixed(2)}
          </p>
        </motion.div>
      ))}
    </div>
  );
});

interface SavingsWaterfallProps {
  baselineMinutes: number;
  optimizedMinutes: number;
  businessValueInr: number;
  className?: string;
}

export const SavingsWaterfall = memo(function SavingsWaterfall({
  baselineMinutes,
  optimizedMinutes,
  businessValueInr,
  className,
}: SavingsWaterfallProps) {
  const saved = Math.max(0, baselineMinutes - optimizedMinutes);
  const data = useMemo(
    () => [
      { name: "Baseline AT", value: baselineMinutes, fill: INDUSTRIAL_CHART.secondary },
      { name: "Saved", value: -saved, fill: INDUSTRIAL_CHART.accent },
      { name: "Target AT", value: optimizedMinutes, fill: INDUSTRIAL_CHART.primary },
      { name: "Value ₹", value: businessValueInr / 500, fill: INDUSTRIAL_CHART.prediction },
    ],
    [baselineMinutes, optimizedMinutes, businessValueInr, saved]
  );

  return (
    <div className={cn("space-y-2", className)} role="img" aria-label={`Savings waterfall: ${saved.toFixed(1)} minutes, ${formatCurrency(businessValueInr)}`}>
      <div className="h-44">
        <WaterfallLazy data={data} />
      </div>
      <p className="text-center text-sm text-accent font-medium">
        {saved.toFixed(1)} min recoverable · {formatCurrency(businessValueInr)}
      </p>
    </div>
  );
});
