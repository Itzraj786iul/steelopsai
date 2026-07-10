import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface LatencySample {
  type: "prediction" | "optimizer" | "hybrid" | "page_load" | "api";
  ms: number;
  timestamp: string;
  cached?: boolean;
}

const MAX_SAMPLES = 200;

interface PerformanceState {
  samples: LatencySample[];
  record: (sample: Omit<LatencySample, "timestamp">) => void;
  clear: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  persist(
    (set, get) => ({
      samples: [],
      record: (sample) => {
        set({
          samples: [{ ...sample, timestamp: new Date().toISOString() }, ...get().samples].slice(0, MAX_SAMPLES),
        });
      },
      clear: () => set({ samples: [] }),
    }),
    { name: "jspl-performance-metrics", partialize: (s) => ({ samples: s.samples }) }
  )
);

export function avgLatency(type: LatencySample["type"], samples: LatencySample[]): number | null {
  const filtered = samples.filter((s) => s.type === type);
  if (!filtered.length) return null;
  return filtered.reduce((a, b) => a + b.ms, 0) / filtered.length;
}

export function performanceSummary(samples: LatencySample[]) {
  const cacheHits = samples.filter((s) => s.cached).length;
  const total = samples.length;
  return {
    avgPredictionMs: avgLatency("prediction", samples),
    avgOptimizerMs: avgLatency("optimizer", samples),
    avgHybridMs: avgLatency("hybrid", samples),
    avgPageLoadMs: avgLatency("page_load", samples),
    cacheHitRate: total ? (cacheHits / total) * 100 : null,
    largestSessionBytes: estimateSessionSize(),
    sampleCount: samples.length,
  };
}

function estimateSessionSize(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("jspl-")) {
      total += (localStorage.getItem(key)?.length ?? 0) * 2;
    }
  }
  return total;
}
