"use client";

import { ConnectionStatus } from "@/lib/enums";
import { useRealtimeStore } from "@/stores/realtime-store";

export function useConnectionStatus() {
  const { status, latencyMs, lastSyncAt } = useRealtimeStore();

  return {
    status,
    latencyMs,
    lastSyncAt,
    isOnline: status === ConnectionStatus.Online,
    isReconnecting: status === ConnectionStatus.Reconnecting,
  };
}
