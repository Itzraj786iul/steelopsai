"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART } from "./chart-theme";

interface IndustrialGaugeProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  color?: string;
  className?: string;
}

export const IndustrialGauge = memo(function IndustrialGauge({
  label,
  value,
  min = 0,
  max = 100,
  unit = "",
  color = INDUSTRIAL_CHART.primary,
  className,
}: IndustrialGaugeProps) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const display = unit ? `${value.toFixed(1)} ${unit}` : value.toFixed(1);

  return (
    <div className={cn("space-y-2", className)} role="meter" aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-label={label}>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium">{display}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
});

interface ConfidenceRingProps {
  score: number;
  tier: string;
  size?: number;
  className?: string;
}

export const ConfidenceRing = memo(function ConfidenceRing({ score, tier, size = 88, className }: ConfidenceRingProps) {
  const r = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score));
  const offset = circumference - (pct / 100) * circumference;
  const color =
    tier === "HIGH" || score >= 75 ? INDUSTRIAL_CHART.accent : tier === "LOW" || score < 50 ? INDUSTRIAL_CHART.warning : INDUSTRIAL_CHART.primary;

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)} role="img" aria-label={`Confidence ${pct.toFixed(0)} percent, ${tier}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-semibold">{pct.toFixed(0)}%</span>
        <span className="text-[10px] uppercase text-muted-foreground">{tier}</span>
      </div>
    </div>
  );
});

interface HeatHealthRingProps {
  score: number;
  band?: string;
  size?: number;
  className?: string;
}

export const HeatHealthRing = memo(function HeatHealthRing({ score, band = "OK", size = 72, className }: HeatHealthRingProps) {
  return <ConfidenceRing score={score} tier={band} size={size} className={className} />;
});
