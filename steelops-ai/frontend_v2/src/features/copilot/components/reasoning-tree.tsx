"use client";

import { motion } from "framer-motion";

import type { EngineTraceStep } from "@/types/preheat.types";

export function ReasoningTree({
  rootCause,
  reasoning,
  trace,
}: {
  rootCause: string;
  reasoning: string;
  trace: EngineTraceStep[];
}) {
  const nodes = [
    { id: "root", label: "Root cause", body: rootCause },
    { id: "engineering", label: "Engineering reasoning", body: reasoning },
    ...trace.slice(0, 4).map((step) => ({
      id: step.engine_id,
      label: step.engine_name,
      body: step.message ?? `${step.status} · ${step.duration_ms.toFixed(0)} ms`,
    })),
  ];

  return (
    <div className="space-y-3">
      {nodes.map((node, index) => (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="relative rounded-lg border border-border/70 bg-muted/20 p-4 pl-6"
        >
          <span className="absolute left-3 top-4 h-2 w-2 rounded-full bg-primary" />
          <p className="text-label">{node.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{node.body}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function EvidenceTimeline({
  references,
}: {
  references: Array<{
    lesson_id?: string;
    description?: string;
    support_heats?: number;
    avg_realised_improvement_min?: number;
    confidence?: string;
  }>;
}) {
  return (
    <div className="relative space-y-4 pl-4 before:absolute before:left-1 before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-border">
      {references.map((ref, index) => (
        <motion.div
          key={ref.lesson_id ?? index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.06 }}
          className="relative"
        >
          <span className="absolute -left-4 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
          <p className="font-medium">{ref.description ?? "Historical lesson"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {ref.support_heats?.toLocaleString() ?? 0} heats · avg {ref.avg_realised_improvement_min?.toFixed(2) ?? "—"} min ·{" "}
            {ref.confidence ?? "MEDIUM"}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
