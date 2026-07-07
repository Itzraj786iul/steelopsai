import { create } from "zustand";

import { ConnectionStatus } from "@/lib/enums";

interface RealtimeState {
  status: ConnectionStatus;
  latencyMs: number | null;
  lastSyncAt: string | null;
  setStatus: (status: ConnectionStatus) => void;
  setLatencyMs: (latencyMs: number | null) => void;
  setLastSyncAt: (value: string | null) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  status: ConnectionStatus.Offline,
  latencyMs: null,
  lastSyncAt: null,
  setStatus: (status) => set({ status }),
  setLatencyMs: (latencyMs) => set({ latencyMs }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
}));
