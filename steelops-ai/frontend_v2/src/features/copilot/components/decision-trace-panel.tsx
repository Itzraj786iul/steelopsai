"use client";

import { motion } from "framer-motion";

import type { EngineTraceStep } from "@/types/preheat.types";

export function DecisionTrace({ trace }: { trace: EngineTraceStep[] }) {
  return (
    <div className="space-y-2">
      {trace.map((step, index) => (
        <motion.div
          key={`${step.engine_id}-${index}`}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04 }}
          className="flex items-start justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm"
        >
          <div>
            <p className="font-medium">{step.engine_name}</p>
            <p className="text-muted-foreground">{step.message ?? step.status}</p>
          </div>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{step.duration_ms.toFixed(0)} ms</span>
        </motion.div>
      ))}
    </div>
  );
}
