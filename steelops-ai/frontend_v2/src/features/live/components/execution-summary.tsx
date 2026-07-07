"use client";

import { motion } from "framer-motion";

import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";
import type { ExecutionSummary } from "@/types/live.types";
import { ActionButton } from "@/components/data-display/action-button";

export function ExecutionSummaryPanel({
  summary,
  onClose,
}: {
  summary: ExecutionSummary;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-label">Heat complete</p>
        <h2 className="text-heading-lg">Execution summary</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SummaryItem label="Predicted heat time" value={formatDurationMinutes(summary.predictedAtMin)} />
          <SummaryItem label="Actual heat time" value={formatDurationMinutes(summary.actualAtMin)} />
          <SummaryItem label="Difference" value={formatDurationMinutes(summary.differenceMin)} />
          <SummaryItem label="Minutes saved" value={formatDurationMinutes(summary.minutesSaved)} accent />
          <SummaryItem label="Business value" value={formatCurrency(summary.businessValueInr)} />
          <SummaryItem label="Recommendation followed" value={summary.recommendationFollowed ? "Yes" : "No"} />
        </div>
        <p className="mt-4 text-sm leading-relaxed">{summary.learningSummary}</p>
        <p className="mt-2 text-sm text-muted-foreground">{summary.confidenceUpdate}</p>
        <ActionButton className="mt-6" onClick={onClose}>
          Close
        </ActionButton>
      </div>
    </motion.div>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-accent/40 bg-accent/5" : "border-border/70"}`}>
      <p className="text-label">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
