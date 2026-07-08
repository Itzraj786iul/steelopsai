import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PredictionHistoryEntry {
  id: string;
  type: "prediction";
  timestamp: number;
  predictedTtt: number;
  ciLower: number;
  ciUpper: number;
  confidence: string;
}

export interface OptimizationHistoryEntry {
  id: string;
  type: "optimization";
  timestamp: number;
  currentTtt: number;
  optimizedTtt: number;
  savingMin: number;
}

export type EafHistoryEntry = PredictionHistoryEntry | OptimizationHistoryEntry;

interface EafHistoryState {
  entries: EafHistoryEntry[];
  addPrediction: (entry: Omit<PredictionHistoryEntry, "id" | "type" | "timestamp">) => void;
  addOptimization: (entry: Omit<OptimizationHistoryEntry, "id" | "type" | "timestamp">) => void;
  clear: () => void;
}

export const useEafHistoryStore = create<EafHistoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      addPrediction: (entry) => {
        const record: PredictionHistoryEntry = {
          id: crypto.randomUUID(),
          type: "prediction",
          timestamp: Date.now(),
          ...entry,
        };
        set({ entries: [record, ...get().entries].slice(0, 50) });
      },
      addOptimization: (entry) => {
        const record: OptimizationHistoryEntry = {
          id: crypto.randomUUID(),
          type: "optimization",
          timestamp: Date.now(),
          ...entry,
        };
        set({ entries: [record, ...get().entries].slice(0, 50) });
      },
      clear: () => set({ entries: [] }),
    }),
    { name: "jspl-eaf-history" }
  )
);
