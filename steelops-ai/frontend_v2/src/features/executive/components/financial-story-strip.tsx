"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ExecutiveSnapshot } from "@/features/executive/utils/executive-metrics";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";

interface FinancialStoryStripProps {
  snapshot: ExecutiveSnapshot;
  className?: string;
}

const KPI_DEFS: Array<{
  key: keyof ExecutiveSnapshot | "custom";
  label: string;
  format: (s: ExecutiveSnapshot) => string;
  highlight?: boolean;
}> = [
  { key: "savingsInr", label: "Today's savings", format: (s) => formatCurrency(s.savingsInr), highlight: true },
  { key: "minutesSaved", label: "Minutes saved", format: (s) => formatDurationMinutes(s.minutesSaved) },
  { key: "heatAverageMin", label: "Heat average", format: (s) => formatDurationMinutes(s.heatAverageMin) },
  { key: "targetAchievementPct", label: "Target achievement", format: (s) => `${s.targetAchievementPct}%` },
  { key: "aiAdoptionPct", label: "AI adoption", format: (s) => `${s.aiAdoptionPct}%` },
  { key: "predictionAccuracyPct", label: "Prediction accuracy", format: (s) => `${s.predictionAccuracyPct}%` },
  { key: "plantHealthScore", label: "Plant health", format: (s) => `${s.plantHealthScore}/100` },
  { key: "co2ReductionT", label: "CO₂ reduction", format: (s) => `${s.co2ReductionT.toFixed(1)}t` },
  { key: "powerSavedMwh", label: "Power saved", format: (s) => `${s.powerSavedMwh.toFixed(1)} MWh` },
  { key: "oxygenSavedNm3", label: "Oxygen saved", format: (s) => `${Math.round(s.oxygenSavedNm3).toLocaleString()} Nm³` },
  { key: "greenHeatPct", label: "GREEN heat", format: (s) => `${s.greenHeatPct.toFixed(1)}%`, highlight: true },
];

export const FinancialStoryStrip = memo(function FinancialStoryStrip({ snapshot, className }: FinancialStoryStripProps) {
  return (
    <section className={cn("rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-card to-card p-6", className)} aria-label="Today's financial story">
      <p className="text-label">Today&apos;s financial story</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {KPI_DEFS.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={cn(
              "rounded-xl border border-border/50 bg-background/50 px-3 py-3",
              kpi.highlight && "border-accent/40 bg-accent/5"
            )}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
            <p className={cn("mt-1 font-mono text-lg font-semibold", kpi.highlight && "text-accent")}>{kpi.format(snapshot)}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
});
