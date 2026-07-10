import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { EafRecipe } from "@/lib/api/eaf";
import {
  APP_VERSION,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
} from "@/lib/constants";

export interface PredictionAuditRecord {
  id: string;
  timestamp: string;
  heatNumber: string;
  shift: string;
  inputRecipe: EafRecipe;
  predictedTtt: number;
  confidence: string | null;
  similarity: number | null;
  modelVersion: string;
  optimizerVersion: string;
  operatorDecision: string | null;
  validationStatus: string;
  heatSessionId: string;
}

export interface RecommendationAuditRecord {
  id: string;
  timestamp: string;
  heatNumber: string;
  shift: string;
  heatSessionId: string;
  originalRecipe: EafRecipe;
  optimizedRecipe: EafRecipe | null;
  acceptance: "Accepted" | "Modified" | "Rejected" | null;
  finalOperatorRecipe: EafRecipe | null;
  validationOutcome: string | null;
  improvementMin: number | null;
  optimizerVersion: string;
}

const MAX_AUDIT = 500;

interface AuditState {
  predictionAudits: PredictionAuditRecord[];
  recommendationAudits: RecommendationAuditRecord[];

  recordPrediction: (entry: Omit<PredictionAuditRecord, "id" | "timestamp" | "modelVersion" | "optimizerVersion">) => void;
  recordRecommendation: (entry: Omit<RecommendationAuditRecord, "id" | "timestamp" | "optimizerVersion">) => void;
  updatePredictionAudit: (heatSessionId: string, patch: Partial<Pick<PredictionAuditRecord, "operatorDecision" | "validationStatus">>) => void;
  updateRecommendationAudit: (
    heatSessionId: string,
    patch: Partial<Pick<RecommendationAuditRecord, "acceptance" | "finalOperatorRecipe" | "validationOutcome">>
  ) => void;
  clearAudits: () => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      predictionAudits: [],
      recommendationAudits: [],

      recordPrediction: (entry) => {
        const record: PredictionAuditRecord = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          modelVersion: PRODUCTION_MODEL_PHASE,
          optimizerVersion: OPTIMIZER_PHASE,
        };
        set({
          predictionAudits: [record, ...get().predictionAudits].slice(0, MAX_AUDIT),
        });
      },

      recordRecommendation: (entry) => {
        const existing = get().recommendationAudits.find((r) => r.heatSessionId === entry.heatSessionId);
        if (existing) {
          set({
            recommendationAudits: get().recommendationAudits.map((r) =>
              r.heatSessionId === entry.heatSessionId
                ? { ...r, ...entry, timestamp: new Date().toISOString() }
                : r
            ),
          });
          return;
        }
        const record: RecommendationAuditRecord = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          optimizerVersion: OPTIMIZER_PHASE,
        };
        set({
          recommendationAudits: [record, ...get().recommendationAudits].slice(0, MAX_AUDIT),
        });
      },

      updatePredictionAudit: (heatSessionId, patch) => {
        set({
          predictionAudits: get().predictionAudits.map((r) =>
            r.heatSessionId === heatSessionId ? { ...r, ...patch } : r
          ),
        });
      },

      updateRecommendationAudit: (heatSessionId, patch) => {
        set({
          recommendationAudits: get().recommendationAudits.map((r) =>
            r.heatSessionId === heatSessionId ? { ...r, ...patch } : r
          ),
        });
      },

      clearAudits: () => set({ predictionAudits: [], recommendationAudits: [] }),
    }),
    { name: "jspl-enterprise-audit" }
  )
);

export function exportAuditsJson() {
  const { predictionAudits, recommendationAudits } = useAuditStore.getState();
  return JSON.stringify(
    { exported_at: new Date().toISOString(), app_version: APP_VERSION, predictionAudits, recommendationAudits },
    null,
    2
  );
}
