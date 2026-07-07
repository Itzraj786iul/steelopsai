"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { FurnaceUnit } from "@/features/executive/utils/executive-metrics";

const STATUS_STYLES = {
  running: "border-accent/50 bg-accent/10 text-accent",
  idle: "border-border/60 bg-muted/20 text-muted-foreground",
  warning: "border-warning/50 bg-warning/10 text-warning",
  critical: "border-critical/50 bg-critical/10 text-critical",
};

export const PlantOverviewMap = memo(function PlantOverviewMap({ furnaces }: { furnaces: FurnaceUnit[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3" role="list" aria-label="Plant overview">
      {furnaces.map((f, i) => (
        <motion.button
          key={f.id}
          type="button"
          role="listitem"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          className={cn(
            "rounded-2xl border-2 p-5 text-left transition-shadow hover:shadow-elevation-md focus-ring",
            STATUS_STYLES[f.status]
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold">{f.label}</p>
            <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs uppercase">{f.status}</span>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Health" value={`${f.health}/100`} />
            <Row label="Risk" value={f.risk} />
            <Row label="Current heat" value={f.currentHeat ?? "—"} />
            <Row label="Savings today" value={formatCurrency(f.savingsInr)} accent />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/50">
            <motion.div
              className="h-full rounded-full bg-current opacity-60"
              initial={{ width: 0 }}
              animate={{ width: `${f.health}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </motion.button>
      ))}
    </div>
  );
});

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", accent && "text-accent")}>{value}</span>
    </div>
  );
}
