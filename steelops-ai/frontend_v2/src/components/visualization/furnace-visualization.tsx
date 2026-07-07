"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const STAGES = ["Charge", "Melt", "Refine", "Tap"] as const;

interface FurnaceVisualizationProps {
  activeStage?: string;
  progress?: number;
  className?: string;
}

export function FurnaceVisualization({ activeStage = "melt", progress = 0.5, className }: FurnaceVisualizationProps) {
  const stageIndex = STAGES.findIndex((s) => activeStage.toLowerCase().includes(s.toLowerCase().slice(0, 4)));
  const active = stageIndex >= 0 ? stageIndex : 1;
  const fillHeight = `${Math.min(100, Math.max(12, progress * 100))}%`;

  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-b from-muted/30 to-card p-4", className)}>
      <p className="text-label mb-3">Furnace stage</p>
      <div className="flex gap-4">
        <div className="relative mx-auto h-36 w-24 shrink-0">
          <div className="absolute inset-x-2 bottom-2 top-6 rounded-b-2xl border-2 border-primary/40 bg-background/80" />
          <motion.div
            className="absolute inset-x-3 bottom-3 rounded-b-xl bg-gradient-to-t from-primary/80 to-primary/30"
            initial={{ height: 0 }}
            animate={{ height: fillHeight }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ maxHeight: "calc(100% - 2rem)" }}
          />
          <motion.div
            className="absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-glow-primary"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div className="flex flex-1 flex-col justify-center gap-2">
          {STAGES.map((stage, i) => (
            <div key={stage} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  i < active ? "bg-accent" : i === active ? "bg-primary animate-pulse-connection" : "bg-muted-foreground/30"
                )}
              />
              <span className={cn(i === active ? "font-medium text-foreground" : "text-muted-foreground")}>{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
