"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART } from "./chart-theme";
import { IndustrialLegend } from "./primitives";
import { formatDurationMinutes } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";

interface PredictionBandProps {
  predicted: number;
  target: number;
  low?: number;
  high?: number;
  savingsMin?: number;
  className?: string;
}

export const PredictionBand = memo(function PredictionBand({
  predicted,
  target,
  low,
  high,
  savingsMin,
  className,
}: PredictionBandProps) {
  const min = low ?? predicted * 0.92;
  const max = high ?? predicted * 1.08;
  const span = max - min || 1;
  const predPct = ((predicted - min) / span) * 100;
  const targetPct = ((target - min) / span) * 100;
  const bandLeft = 0;
  const bandWidth = 100;

  return (
    <div className={cn("space-y-4", className)} role="img" aria-label={`Prediction ${formatDurationMinutes(predicted)}, target ${formatDurationMinutes(target)}`}>
      <div className="relative h-14 rounded-xl bg-muted/40 px-2">
        <div
          className="absolute top-1/2 h-8 -translate-y-1/2 rounded-lg bg-prediction/20 border border-prediction/40"
          style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
          aria-hidden
        />
        <motion.div
          className="absolute top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-prediction"
          style={{ left: `${predPct}%` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          title={`Predicted ${formatDurationMinutes(predicted)}`}
        />
        <motion.div
          className="absolute top-1/2 h-12 w-1.5 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_12px_rgba(6,214,160,0.5)]"
          style={{ left: `${targetPct}%` }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          title={`Target ${formatDurationMinutes(target)}`}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="text-muted-foreground">95% low</p>
          <p className="font-mono font-medium">{formatDurationMinutes(min)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Predicted</p>
          <p className="font-mono font-semibold text-prediction">{formatDurationMinutes(predicted)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Target</p>
          <p className="font-mono font-semibold text-accent">{formatDurationMinutes(target)}</p>
        </div>
      </div>
      {savingsMin != null && savingsMin > 0 ? (
        <p className="text-center text-sm text-accent">
          Expected saving <span className="font-mono font-semibold">{formatDurationMinutes(savingsMin)}</span>
        </p>
      ) : null}
      <IndustrialLegend
        items={[
          { label: "Confidence band", color: INDUSTRIAL_CHART.prediction },
          { label: "Prediction", color: INDUSTRIAL_CHART.prediction },
          { label: "Target", color: INDUSTRIAL_CHART.accent },
        ]}
      />
    </div>
  );
});

interface TwinComparisonProps {
  baseline: number;
  optimized: number;
  label?: string;
  unit?: string;
  className?: string;
}

export const TwinComparison = memo(function TwinComparison({
  baseline,
  optimized,
  label = "Heat time",
  unit = "min",
  className,
}: TwinComparisonProps) {
  const max = Math.max(baseline, optimized, 1);
  const baseW = (baseline / max) * 100;
  const optW = (optimized / max) * 100;
  const delta = baseline - optimized;

  return (
    <div className={cn("space-y-3", className)} role="img" aria-label={`${label}: baseline ${baseline}, optimized ${optimized}`}>
      <p className="text-label">{label}</p>
      <div className="space-y-2">
        <BarRow label="Baseline" value={baseline} width={baseW} color={INDUSTRIAL_CHART.secondary} unit={unit} />
        <BarRow label="Optimized" value={optimized} width={optW} color={INDUSTRIAL_CHART.primary} unit={unit} />
      </div>
      {delta > 0 ? (
        <p className="text-sm text-accent font-medium">−{delta.toFixed(1)} {unit} vs baseline</p>
      ) : null}
    </div>
  );
});

function BarRow({ label, value, width, color, unit }: { label: string; value: number; width: number; color: string; unit: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-xs">{value.toFixed(1)} {unit}</span>
    </div>
  );
}

interface PredictionDriftProps {
  predicted: number;
  actual: number;
  className?: string;
}

export const PredictionDrift = memo(function PredictionDrift({ predicted, actual, className }: PredictionDriftProps) {
  const drift = actual - predicted;
  const color = Math.abs(drift) < 1 ? INDUSTRIAL_CHART.accent : drift > 0 ? INDUSTRIAL_CHART.warning : INDUSTRIAL_CHART.secondary;

  return (
    <div className={cn("flex items-center gap-4", className)} role="status" aria-label={`Prediction drift ${drift.toFixed(1)} minutes`}>
      <TwinComparison baseline={predicted} optimized={actual} label="Predicted vs actual" />
      <div className="rounded-lg border border-border/60 px-3 py-2 text-center">
        <p className="text-label">Drift</p>
        <p className="font-mono text-lg font-semibold" style={{ color }}>
          {drift > 0 ? "+" : ""}
          {drift.toFixed(1)} min
        </p>
      </div>
    </div>
  );
});

interface CostBreakdownProps {
  items: Array<{ label: string; value: number }>;
  className?: string;
}

export const CostBreakdown = memo(function CostBreakdown({ items, className }: CostBreakdownProps) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 text-muted-foreground">{item.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / total) * 100}%` }} />
          </div>
          <span className="w-20 shrink-0 text-right font-mono text-xs">{formatCurrency(item.value)}</span>
        </div>
      ))}
    </div>
  );
});
