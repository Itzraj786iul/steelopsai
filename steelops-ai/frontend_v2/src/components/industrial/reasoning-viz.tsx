"use client";

import { memo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART, industrialAxisProps, industrialGridProps, industrialTooltipStyle } from "./chart-theme";
import type { ReasoningNode, ShapDriver, SimilarHeatNode } from "./types";

const ShapChartLazy = dynamic(
  () =>
    import("recharts").then((m) => {
      const { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } = m;
      return function ShapChart({ data }: { data: Array<{ feature: string; impact: number }> }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid {...industrialGridProps} />
              <XAxis type="number" {...industrialAxisProps} />
              <YAxis type="category" dataKey="feature" width={72} {...industrialAxisProps} />
              <Tooltip contentStyle={industrialTooltipStyle} />
              <Bar dataKey="impact" radius={[0, 4, 4, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={INDUSTRIAL_CHART.prediction} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <div className="h-40 shimmer rounded-xl" /> }
);

interface SHAPWaterfallProps {
  drivers: ShapDriver[];
  className?: string;
}

export const SHAPWaterfall = memo(function SHAPWaterfall({ drivers, className }: SHAPWaterfallProps) {
  const data = drivers.map((d) => ({ feature: d.feature, impact: d.impact }));
  return (
    <div className={cn("h-44", className)} role="img" aria-label="SHAP feature impact waterfall">
      <ShapChartLazy data={data} />
    </div>
  );
});

export const ContributionTree = SHAPWaterfall;

interface ReasoningFlowProps {
  nodes: ReasoningNode[];
  className?: string;
}

const KIND_COLORS: Record<ReasoningNode["kind"], string> = {
  variable: INDUSTRIAL_CHART.prediction,
  mechanism: INDUSTRIAL_CHART.secondary,
  stage: INDUSTRIAL_CHART.primary,
  impact: INDUSTRIAL_CHART.accent,
  action: INDUSTRIAL_CHART.warning,
};

export const ReasoningFlow = memo(function ReasoningFlow({ nodes, className }: ReasoningFlowProps) {
  return (
    <div className={cn("space-y-0", className)} role="list" aria-label="Reasoning chain">
      {nodes.map((node, i) => (
        <div key={node.id} role="listitem">
          <motion.div
            className="rounded-xl border border-border/60 bg-muted/10 p-4"
            style={{ borderLeftWidth: 4, borderLeftColor: KIND_COLORS[node.kind] }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <p className="text-label">{node.label}</p>
            <p className="mt-2 text-sm leading-relaxed">{node.body}</p>
          </motion.div>
          {i < nodes.length - 1 ? (
            <div className="flex justify-center py-1">
              <div className="h-4 w-px bg-border" aria-hidden />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
});

interface HeatFingerprintProps {
  currentLabel: string;
  similar: SimilarHeatNode[];
  className?: string;
}

export const HeatFingerprint = memo(function HeatFingerprint({ currentLabel, similar, className }: HeatFingerprintProps) {
  return (
    <div className={cn("relative mx-auto h-56 w-full max-w-sm", className)} role="img" aria-label="Heat similarity fingerprint">
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-primary/20 text-center text-xs font-bold shadow-glow-primary"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {currentLabel}
      </motion.div>
      {similar.map((heat, i) => {
        const angle = (i / similar.length) * Math.PI * 2 - Math.PI / 2;
        const dist = 72 + heat.distance * 24;
        const x = 50 + Math.cos(angle) * (dist / 2.8);
        const y = 50 + Math.sin(angle) * (dist / 2.8);
        return (
          <motion.button
            key={heat.id}
            type="button"
            className="absolute z-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-border/70 bg-card text-[9px] hover:border-accent focus-ring"
            style={{ left: `${x}%`, top: `${y}%` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            title={`${heat.label}: ${heat.outcome}`}
          >
            <span className="font-mono font-semibold">{heat.label}</span>
            <span className="text-accent">{heat.greenProbability.toFixed(0)}%</span>
          </motion.button>
        );
      })}
    </div>
  );
});

interface RiskMatrixProps {
  items: Array<{ label: string; likelihood: number; impact: number }>;
  className?: string;
}

export const RiskMatrix = memo(function RiskMatrix({ items, className }: RiskMatrixProps) {
  return (
    <div className={cn("grid grid-cols-3 gap-1", className)} role="grid" aria-label="Risk matrix">
      {items.map((item) => {
        const score = item.likelihood * item.impact;
        const color = score > 6 ? INDUSTRIAL_CHART.critical : score > 3 ? INDUSTRIAL_CHART.warning : INDUSTRIAL_CHART.accent;
        return (
          <div
            key={item.label}
            className="rounded-md border border-border/50 p-2 text-center text-xs"
            style={{ backgroundColor: `${color}22` }}
            role="gridcell"
          >
            <p className="font-medium">{item.label}</p>
            <p className="text-muted-foreground">L{item.likelihood}·I{item.impact}</p>
          </div>
        );
      })}
    </div>
  );
});

interface PlantStatusGridProps {
  cells: Array<{ label: string; status: "ok" | "warn" | "critical" | "idle" }>;
  className?: string;
}

const STATUS_COLORS = {
  ok: INDUSTRIAL_CHART.accent,
  warn: INDUSTRIAL_CHART.warning,
  critical: INDUSTRIAL_CHART.critical,
  idle: INDUSTRIAL_CHART.muted,
};

export const PlantStatusGrid = memo(function PlantStatusGrid({ cells, className }: PlantStatusGridProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)} role="list">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-border/60 px-3 py-2 text-sm"
          style={{ borderLeftColor: STATUS_COLORS[cell.status], borderLeftWidth: 3 }}
          role="listitem"
        >
          <p className="font-medium">{cell.label}</p>
          <p className="text-xs uppercase text-muted-foreground">{cell.status}</p>
        </div>
      ))}
    </div>
  );
});

interface ProductionCalendarProps {
  days: Array<{ label: string; heats: number; savings: number }>;
  className?: string;
}

export const ProductionCalendar = memo(function ProductionCalendar({ days, className }: ProductionCalendarProps) {
  const maxHeats = Math.max(...days.map((d) => d.heats), 1);
  return (
    <div className={cn("grid grid-cols-7 gap-1", className)} role="img" aria-label="Production calendar">
      {days.map((day) => (
        <div key={day.label} className="rounded-md border border-border/50 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">{day.label}</p>
          <div
            className="mx-auto mt-1 w-full rounded-sm bg-primary/30"
            style={{ height: `${(day.heats / maxHeats) * 32 + 4}px` }}
          />
          <p className="mt-1 font-mono text-xs">{day.heats}</p>
        </div>
      ))}
    </div>
  );
});

interface HeatFunnelProps {
  stages: Array<{ label: string; count: number }>;
  className?: string;
}

export const HeatFunnel = memo(function HeatFunnel({ stages, className }: HeatFunnelProps) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className={cn("space-y-2", className)} role="img" aria-label="Heat funnel">
      {stages.map((stage, i) => (
        <motion.div
          key={stage.label}
          className="mx-auto rounded-lg bg-primary/20 py-2 text-center text-sm font-medium"
          style={{ width: `${(stage.count / max) * 100}%`, minWidth: "40%" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          {stage.label} · {stage.count}
        </motion.div>
      ))}
    </div>
  );
});

interface TrendRiverProps {
  points: number[];
  className?: string;
}

export const TrendRiver = memo(function TrendRiver({ points, className }: TrendRiverProps) {
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((p - min) / span) * 80 - 10;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" className={cn("h-24 w-full", className)} role="img" aria-label="Trend river">
      <motion.path d={path} fill="none" stroke={INDUSTRIAL_CHART.primary} strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />
    </svg>
  );
});
