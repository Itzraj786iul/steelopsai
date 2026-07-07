"use client";

import { memo } from "react";
import { motion } from "framer-motion";

import { mapTimelineStages } from "@/features/live/utils/live-utils";
import type { TimelineEvent } from "@/types/live.types";

export const StageTimeline = memo(function StageTimeline({
  events,
  status,
}: {
  events: TimelineEvent[];
  status: string;
}) {
  const stages = mapTimelineStages(events, status);

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            stage.state === "current"
              ? "border-primary bg-primary/10 shadow-glow-primary"
              : stage.state === "complete"
                ? "border-success/40 bg-success/5"
                : "border-border/60 bg-muted/15 opacity-60"
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full ${
              stage.state === "current" ? "bg-primary animate-pulse" : stage.state === "complete" ? "bg-success" : "bg-muted-foreground/40"
            }`}
          />
          <div>
            <p className="font-medium">{stage.label}</p>
            <p className="text-xs text-muted-foreground capitalize">{stage.state}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
});
