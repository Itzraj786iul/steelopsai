"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

import { ALERT_LABELS } from "@/features/live/utils/live-utils";
import { ActionButton } from "@/components/data-display/action-button";
import type { LiveAlertItem } from "@/types/live.types";

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: "border-destructive/50 bg-destructive/10 text-destructive",
  HIGH: "border-warning/50 bg-warning/10 text-warning",
  MEDIUM: "border-primary/40 bg-primary/10 text-primary",
  LOW: "border-border bg-muted/20 text-muted-foreground",
};

export function AlertFeed({
  alerts,
  onAcknowledge,
}: {
  alerts: LiveAlertItem[];
  onAcknowledge: (alertId: string) => void;
}) {
  return (
    <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
      <AnimatePresence initial={false}>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className={`rounded-lg border p-3 text-sm ${SEVERITY_CLASS[alert.severity] ?? SEVERITY_CLASS.MEDIUM}`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{ALERT_LABELS[alert.trigger_code] ?? alert.trigger_code}</p>
                <p className="mt-1">{alert.message}</p>
                {alert.recommendation ? <p className="mt-1 text-xs opacity-90">{alert.recommendation}</p> : null}
              </div>
            </div>
            {alert.status === "OPEN" ? (
              <ActionButton size="sm" variant="outline" className="mt-3" onClick={() => onAcknowledge(alert.id)}>
                Acknowledge
              </ActionButton>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
      {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No active alerts.</p> : null}
    </div>
  );
}
