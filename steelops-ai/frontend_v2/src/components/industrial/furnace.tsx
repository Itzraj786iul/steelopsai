"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART } from "./chart-theme";
import { IndustrialGauge } from "./gauges";
import { ProcessFlow, resolveStageIndex } from "./process-flow";

const STAGES = ["Charging", "Melting", "Oxidation", "Refining", "Tapping"] as const;

interface FurnaceCrossSectionProps {
  activeStage?: string;
  progress?: number;
  temperature?: number;
  carbon?: number;
  phosphorus?: number;
  slag?: number;
  power?: number;
  className?: string;
}

export const FurnaceCrossSection = memo(function FurnaceCrossSection({
  activeStage = "Melting",
  progress = 0.5,
  temperature = 1650,
  carbon = 0.06,
  phosphorus = 0.03,
  slag = 12,
  power = 85,
  className,
}: FurnaceCrossSectionProps) {
  const stageIndex = resolveStageIndex(activeStage);
  const fillHeight = `${Math.min(92, Math.max(15, progress * 100))}%`;

  return (
    <div className={cn("space-y-4", className)} role="img" aria-label={`Furnace at ${STAGES[stageIndex] ?? activeStage} stage`}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative flex flex-col items-center rounded-xl border border-border/70 bg-gradient-to-b from-muted/20 to-card p-4">
          <svg viewBox="0 0 120 160" className="h-40 w-28" aria-hidden>
            <ellipse cx="60" cy="28" rx="36" ry="10" fill="none" stroke={INDUSTRIAL_CHART.primary} strokeWidth="2" opacity="0.5" />
            <path
              d="M 28 28 L 24 140 Q 60 152 96 140 L 92 28 Z"
              fill="hsl(var(--card))"
              stroke={INDUSTRIAL_CHART.primary}
              strokeWidth="2"
            />
            <motion.rect
              x="30"
              y="140"
              width="60"
              height="0"
              fill="url(#meltGrad)"
              clipPath="url(#furnaceClip)"
              initial={{ height: 0 }}
              animate={{ height: 100 * progress }}
              style={{ transform: "translateY(-100px)" }}
              transition={{ duration: 0.6 }}
            />
            <defs>
              <clipPath id="furnaceClip">
                <path d="M 30 40 L 28 138 Q 60 148 92 138 L 90 40 Z" />
              </clipPath>
              <linearGradient id="meltGrad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor={INDUSTRIAL_CHART.primary} stopOpacity="0.9" />
                <stop offset="100%" stopColor={INDUSTRIAL_CHART.warning} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <motion.circle
              cx="60"
              cy="20"
              r="4"
              fill={INDUSTRIAL_CHART.primary}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </svg>
          <div className="absolute bottom-6 left-1/2 h-24 w-16 -translate-x-1/2 overflow-hidden rounded-b-2xl opacity-40">
            <motion.div
              className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary/30"
              style={{ height: fillHeight }}
            />
          </div>
          <p className="mt-2 text-sm font-medium">{STAGES[stageIndex] ?? activeStage}</p>
        </div>
        <ProcessFlow stages={STAGES} activeIndex={stageIndex} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <IndustrialGauge label="Temperature" value={temperature} min={1400} max={1750} unit="°C" color={INDUSTRIAL_CHART.warning} />
        <IndustrialGauge label="Carbon" value={carbon * 100} min={0} max={10} unit="%" color={INDUSTRIAL_CHART.secondary} />
        <IndustrialGauge label="Phosphorus" value={phosphorus * 1000} min={0} max={50} unit="ppm" color={INDUSTRIAL_CHART.prediction} />
        <IndustrialGauge label="Slag" value={slag} min={0} max={25} unit="%" color={INDUSTRIAL_CHART.muted} />
        <IndustrialGauge label="Power" value={power} min={0} max={100} unit="%" color={INDUSTRIAL_CHART.primary} className="col-span-2" />
      </div>
    </div>
  );
});

interface TwinPlaybackProps {
  progress: number;
  onChange: (value: number) => void;
  baselineLabel?: string;
  optimizedLabel?: string;
  className?: string;
}

export const TwinPlayback = memo(function TwinPlayback({
  progress,
  onChange,
  baselineLabel = "Baseline",
  optimizedLabel = "Optimized",
  className,
}: TwinPlaybackProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{baselineLabel}</span>
        <span className="font-mono text-foreground">{Math.round(progress * 100)}%</span>
        <span>{optimizedLabel}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(progress * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-ring"
        aria-label="Twin simulation playback"
      />
      <motion.div
        className="h-1 rounded-full bg-primary"
        style={{ width: `${progress * 100}%` }}
        layout
      />
    </div>
  );
});
