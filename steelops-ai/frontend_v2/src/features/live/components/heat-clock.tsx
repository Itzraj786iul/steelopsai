"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { formatElapsed } from "@/features/live/utils/live-utils";
import { formatDurationMinutes } from "@/lib/date-utils";

interface HeatClockProps {
  elapsedSeconds: number;
  predictedAtMin: number;
  status: string;
}

export function HeatClock({ elapsedSeconds, predictedAtMin, status }: HeatClockProps) {
  const [elapsed, setElapsed] = useState(elapsedSeconds);

  useEffect(() => {
    setElapsed(elapsedSeconds);
    if (status === "COMPLETED" || status === "PAUSED") return;
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [elapsedSeconds, status]);

  const remainingMin = Math.max(0, predictedAtMin - elapsed / 60);

  return (
    <motion.div layout className="grid grid-cols-3 gap-3">
      <ClockTile label="Elapsed" value={formatElapsed(elapsed)} />
      <ClockTile label="Remaining" value={formatDurationMinutes(remainingMin)} accent />
      <ClockTile label="Target finish" value={formatDurationMinutes(predictedAtMin)} />
    </motion.div>
  );
}

function ClockTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border/70 bg-muted/20"}`}>
      <p className="text-label">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
