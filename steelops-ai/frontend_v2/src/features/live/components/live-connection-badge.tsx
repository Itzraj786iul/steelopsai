"use client";

import { motion } from "framer-motion";
import { ConnectionStatus } from "@/lib/enums";
import { useRealtimeStore } from "@/stores/realtime-store";
import { formatRelativeTime } from "@/lib/date-utils";

export function LiveConnectionBadge() {
  const status = useRealtimeStore((s) => s.status);
  const latencyMs = useRealtimeStore((s) => s.latencyMs);
  const lastSyncAt = useRealtimeStore((s) => s.lastSyncAt);

  const color =
    status === ConnectionStatus.Online
      ? "bg-success/15 text-success border-success/30"
      : status === ConnectionStatus.Reconnecting
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-destructive/15 text-destructive border-destructive/30";

  return (
    <motion.div layout className={`rounded-full border px-3 py-1 text-xs font-medium ${color}`}>
      {status}
      {latencyMs != null ? ` · ${latencyMs}ms` : ""}
      {lastSyncAt ? ` · ${formatRelativeTime(lastSyncAt)}` : ""}
    </motion.div>
  );
}
