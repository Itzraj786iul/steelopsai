"use client";

import { motion } from "framer-motion";

import { currentStageLabel, stageProgress } from "@/features/live/utils/live-utils";

export function CurrentStageCard({ status, progressPct }: { status: string; progressPct?: number }) {
  const progress = progressPct ?? stageProgress(status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-5"
    >
      <p className="text-label">Current stage</p>
      <h2 className="mt-2 text-3xl font-semibold">{currentStageLabel(status)}</h2>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
        />
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{progress}% through heat cycle</p>
    </motion.div>
  );
}
