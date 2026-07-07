"use client";

import { motion } from "framer-motion";

interface SimulationSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export function SimulationSlider({ value, onChange }: SimulationSliderProps) {
  const pct = Math.round(value * 100);

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <p className="text-label">Simulation replay</p>
        <span className="font-mono text-primary">{pct}% optimized</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        className="h-2 w-full cursor-pointer accent-primary"
        aria-label="Simulation progress"
      />
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>Planned</span>
        <span>Optimized</span>
      </div>
      <motion.div
        className="mt-3 h-1.5 rounded-full bg-border"
        layout
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </motion.div>
    </div>
  );
}
