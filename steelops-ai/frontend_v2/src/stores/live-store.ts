import { create } from "zustand";

import type { LiveHeatDetail } from "@/types/live.types";

interface LiveState {
  activeHeatId: string | null;
  detail: LiveHeatDetail | null;
  notes: string[];
  paused: boolean;
  setActiveHeatId: (heatId: string | null) => void;
  setDetail: (detail: LiveHeatDetail | null) => void;
  addNote: (note: string) => void;
  setPaused: (paused: boolean) => void;
  reset: () => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  activeHeatId: null,
  detail: null,
  notes: [],
  paused: false,
  setActiveHeatId: (activeHeatId) => set({ activeHeatId }),
  setDetail: (detail) => set({ detail }),
  addNote: (note) => set((state) => ({ notes: [...state.notes, note] })),
  setPaused: (paused) => set({ paused }),
  reset: () => set({ activeHeatId: null, detail: null, notes: [], paused: false }),
}));
