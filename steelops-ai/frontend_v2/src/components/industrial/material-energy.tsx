"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART } from "./chart-theme";

interface FlowBarProps {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}

function FlowBar({ label, value, max, color, unit = "" }: FlowBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value.toFixed(1)}{unit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} animate={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

interface MaterialFlowProps {
  inputs: Array<{ label: string; value: number }>;
  className?: string;
}

export const MaterialFlow = memo(function MaterialFlow({ inputs, className }: MaterialFlowProps) {
  const max = Math.max(...inputs.map((i) => i.value), 1);
  return (
    <div className={cn("space-y-3", className)} role="img" aria-label="Material flow">
      {inputs.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
          <FlowBar label={item.label} value={item.value} max={max} color={INDUSTRIAL_CHART.secondary} unit=" t" />
        </motion.div>
      ))}
    </div>
  );
});

export const MaterialBalance = MaterialFlow;
export const MaterialDifference = MaterialFlow;

interface EnergyFlowProps {
  powerKwh: number;
  oxygen?: number;
  greenPct?: number;
  className?: string;
}

export const EnergyFlow = memo(function EnergyFlow({ powerKwh, oxygen = 0, greenPct = 0, className }: EnergyFlowProps) {
  return (
    <div className={cn("grid gap-3", className)} role="img" aria-label="Energy flow">
      <FlowBar label="Electrical Energy" value={powerKwh / 1000} max={50} color={INDUSTRIAL_CHART.primary} unit=" MWh" />
      <FlowBar label="Oxygen" value={oxygen} max={5000} color={INDUSTRIAL_CHART.secondary} unit=" Nm³" />
      <FlowBar label="GREEN" value={greenPct} max={100} color={INDUSTRIAL_CHART.accent} unit="%" />
    </div>
  );
});

export const CarbonFlow = memo(function CarbonFlow({ carbonPct }: { carbonPct: number; className?: string }) {
  return <FlowBar label="Carbon" value={carbonPct} max={0.15 * 100} color={INDUSTRIAL_CHART.warning} unit="%" />;
});

export const SlagFlow = memo(function SlagFlow({ slagPct, className }: { slagPct: number; className?: string }) {
  return (
    <div className={className}>
      <FlowBar label="Slag" value={slagPct} max={20} color={INDUSTRIAL_CHART.muted} unit="%" />
    </div>
  );
});
