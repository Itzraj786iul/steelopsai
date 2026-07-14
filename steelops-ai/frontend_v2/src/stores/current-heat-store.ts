import { create } from "zustand";
import { persist } from "zustand/middleware";

import type {
  EafRecipe,
  HybridTrustResponse,
  OptimizeResponse,
  OptimizeV2Response,
  PredictResponse,
} from "@/lib/api/eaf";
import { DEFAULT_RECIPE } from "@/lib/api/eaf";
import type { LifecycleTimestamps, OperatorActivityEntry } from "@/lib/shift-operations";
import { recordLifecycleTimestamp, touchOperatorActivity } from "@/lib/shift-operations";
import { useAuditStore } from "@/stores/audit-store";

export type RecommendationAcceptanceStatus = "Accepted" | "Modified" | "Rejected";

export interface HeatValidationState {
  actualTtt?: string;
  optimizerUsed?: string;
  recommendationApplied?: string;
  operatorComments?: string;
  validatedAt?: string;
}

export interface HeatSessionSnapshot {
  id: string;
  /** Permanent SQLite HeatRecord id once synced to the API. */
  heatRecordId?: string | null;
  heatNumber: string;
  shift: string;
  recipe: EafRecipe;
  prediction: PredictResponse | null;
  hybrid: HybridTrustResponse | null;
  optimizer: OptimizeResponse | null;
  optimizerV2: OptimizeV2Response | null;
  validation: HeatValidationState | null;
  confidence: string | null;
  lastUpdated: string | null;
  warnings: string[];
  recommendationAcceptance: RecommendationAcceptanceStatus | null;
  archived: boolean;
  lifecycleTimestamps?: LifecycleTimestamps;
}

const MAX_HISTORY = 20;

function emptySession(recipe: EafRecipe = DEFAULT_RECIPE, heatNumber = ""): HeatSessionSnapshot {
  return {
    id: crypto.randomUUID(),
    heatRecordId: null,
    heatNumber,
    shift: recipe.Shift,
    recipe: { ...recipe },
    prediction: null,
    hybrid: null,
    optimizer: null,
    optimizerV2: null,
    validation: null,
    confidence: null,
    lastUpdated: null,
    warnings: [],
    recommendationAcceptance: null,
    archived: false,
  };
}

function recipesEqual(a: EafRecipe, b: EafRecipe): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function normalizeSession(session: HeatSessionSnapshot): HeatSessionSnapshot {
  return {
    ...session,
    heatRecordId: session.heatRecordId ?? null,
    recommendationAcceptance: session.recommendationAcceptance ?? null,
    archived: session.archived ?? false,
  };
}

interface CurrentHeatState {
  active: HeatSessionSnapshot | null;
  sessionHistory: HeatSessionSnapshot[];
  operatorActivity: OperatorActivityEntry[];
  panelCollapsed: boolean;
  mobileSheetOpen: boolean;
  toast: string | null;
  recipeDirty: boolean;

  setHeatNumber: (heatNumber: string) => void;
  setRecipe: (recipe: EafRecipe) => void;
  updateRecipeField: <K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => void;
  updatePrediction: (
    prediction: PredictResponse,
    hybrid?: HybridTrustResponse | null,
    warnings?: string[]
  ) => void;
  updateOptimizer: (optimizer?: OptimizeResponse | null, optimizerV2?: OptimizeV2Response | null) => void;
  updateHybrid: (hybrid: HybridTrustResponse) => void;
  updateValidation: (validation: HeatValidationState) => void;
  setRecommendationAcceptance: (status: RecommendationAcceptanceStatus) => void;
  /** Persist the SQLite HeatRecord id returned by /heats sync APIs. */
  setHeatRecordId: (heatRecordId: string) => void;
  saveHeat: () => void;
  loadHeat: (id: string) => void;
  clearHeat: () => void;
  hasActiveHeat: () => boolean;
  setPanelCollapsed: (collapsed: boolean) => void;
  setMobileSheetOpen: (open: boolean) => void;
  recordReportExport: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useCurrentHeatStore = create<CurrentHeatState>()(
  persist(
    (set, get) => ({
      active: null,
      sessionHistory: [],
      operatorActivity: [],
      panelCollapsed: false,
      mobileSheetOpen: false,
      toast: null,
      recipeDirty: false,

      setHeatNumber: (heatNumber) => {
        const active = get().active;
        if (!active) {
          set({
            active: {
              ...emptySession(),
              heatNumber,
              lastUpdated: new Date().toISOString(),
              lifecycleTimestamps: recordLifecycleTimestamp(undefined, "recipeEntered"),
            },
          });
          return;
        }
        set({
          active: {
            ...active,
            heatNumber,
            lastUpdated: new Date().toISOString(),
          },
        });
      },

      setRecipe: (recipe) => {
        const active = get().active;
        const base = active ?? emptySession(recipe);
        const changed = active ? !recipesEqual(active.recipe, recipe) : false;
        set({
          active: {
            ...base,
            recipe: { ...recipe },
            shift: recipe.Shift,
            lastUpdated: new Date().toISOString(),
            lifecycleTimestamps: recordLifecycleTimestamp(base.lifecycleTimestamps, "recipeEntered"),
            ...(changed
              ? {
                  prediction: null,
                  hybrid: null,
                  optimizer: null,
                  optimizerV2: null,
                  confidence: null,
                  warnings: [],
                  recommendationAcceptance: null,
                }
              : {}),
          },
          recipeDirty: changed && !!active?.prediction,
        });
      },

      updateRecipeField: (key, value) => {
        const active = get().active ?? emptySession();
        const recipe = { ...active.recipe, [key]: value };
        get().setRecipe(recipe);
      },

      updatePrediction: (prediction, hybrid = null, warnings = []) => {
        const active = get().active ?? emptySession();
        const confidence =
          prediction.confidence ??
          prediction.operator_summary?.confidence ??
          prediction.explainability?.prediction_quality ??
          null;
        const timestamps = hybrid
          ? recordLifecycleTimestamp(
              recordLifecycleTimestamp(active.lifecycleTimestamps, "prediction"),
              "hybrid"
            )
          : recordLifecycleTimestamp(active.lifecycleTimestamps, "prediction");
        set({
          active: {
            ...active,
            prediction,
            hybrid,
            confidence,
            warnings,
            shift: active.recipe.Shift,
            lastUpdated: new Date().toISOString(),
            lifecycleTimestamps: timestamps,
          },
          operatorActivity: touchOperatorActivity(get().operatorActivity, {
            heatId: active.id,
            heatNumber: active.heatNumber,
            action: "prediction",
          }),
          recipeDirty: false,
        });
        get().saveHeat();
        get().showToast("Recipe saved to Current Heat");
      },

      updateOptimizer: (optimizer, optimizerV2) => {
        const active = get().active;
        if (!active) return;
        set({
          active: {
            ...active,
            optimizer: optimizer !== undefined ? optimizer : active.optimizer,
            optimizerV2: optimizerV2 !== undefined ? optimizerV2 : active.optimizerV2,
            lastUpdated: new Date().toISOString(),
            lifecycleTimestamps: recordLifecycleTimestamp(active.lifecycleTimestamps, "optimization"),
          },
          operatorActivity: touchOperatorActivity(get().operatorActivity, {
            heatId: active.id,
            heatNumber: active.heatNumber,
            action: "optimization",
          }),
        });
        get().saveHeat();
      },

      updateHybrid: (hybrid) => {
        const active = get().active;
        if (!active) return;
        set({
          active: {
            ...active,
            hybrid,
            lastUpdated: new Date().toISOString(),
          },
        });
      },

      updateValidation: (validation) => {
        const active = get().active;
        if (!active) return;
        const withTimestamp = {
          ...validation,
          validatedAt: validation.validatedAt ?? new Date().toISOString(),
        };
        set({
          active: {
            ...active,
            validation: withTimestamp,
            lastUpdated: new Date().toISOString(),
            lifecycleTimestamps: recordLifecycleTimestamp(active.lifecycleTimestamps, "validation"),
          },
          operatorActivity: touchOperatorActivity(get().operatorActivity, {
            heatId: active.id,
            heatNumber: active.heatNumber,
            action: "validated",
          }),
        });
        get().saveHeat();
        useAuditStore.getState().updatePredictionAudit(active.id, {
          validationStatus: withTimestamp.actualTtt && withTimestamp.actualTtt !== "Pending" ? "Validated" : "Pending",
        });
        useAuditStore.getState().updateRecommendationAudit(active.id, {
          validationOutcome: withTimestamp.actualTtt ?? null,
          finalOperatorRecipe: active.recipe,
        });
        void import("@/lib/heat-history-sync").then((m) => m.syncHeatAfterValidation());
      },

      setRecommendationAcceptance: (status) => {
        const active = get().active;
        if (!active) return;
        const actionMap = { Accepted: "accepted", Modified: "modified", Rejected: "rejected" } as const;
        set({
          active: {
            ...active,
            recommendationAcceptance: status,
            lastUpdated: new Date().toISOString(),
            lifecycleTimestamps: recordLifecycleTimestamp(active.lifecycleTimestamps, "operatorReview"),
          },
          operatorActivity: touchOperatorActivity(get().operatorActivity, {
            heatId: active.id,
            heatNumber: active.heatNumber,
            action: actionMap[status],
          }),
        });
        get().saveHeat();
        useAuditStore.getState().updateRecommendationAudit(active.id, {
          acceptance: status,
          finalOperatorRecipe: active.recipe,
        });
        useAuditStore.getState().updatePredictionAudit(active.id, { operatorDecision: status });
        get().showToast(`Recommendation ${status.toLowerCase()}`);
        void import("@/lib/heat-history-sync").then((m) => m.syncHeatAfterOptimizer());
      },

      setHeatRecordId: (heatRecordId) => {
        const active = get().active;
        if (!active || !heatRecordId) return;
        const next = { ...active, heatRecordId };
        set({ active: next });
        // Keep sessionHistory copy in sync so recovery / New Heat archive work.
        const without = get().sessionHistory.filter((h) => h.id !== active.id);
        if (active.prediction) {
          set({ sessionHistory: [next, ...without].slice(0, MAX_HISTORY) });
        }
      },

      saveHeat: () => {
        const { active, sessionHistory } = get();
        if (!active?.prediction) return;
        const without = sessionHistory.filter((h) => h.id !== active.id);
        set({
          sessionHistory: [active, ...without].slice(0, MAX_HISTORY),
        });
      },

      loadHeat: (id) => {
        const current = get().active;
        if (current?.id === id) return;
        const fromHistory = get().sessionHistory.find((h) => h.id === id);
        if (fromHistory) {
          if (current?.prediction && current.id !== id) {
            const archived = {
              ...current,
              archived: true,
              lifecycleTimestamps: recordLifecycleTimestamp(current.lifecycleTimestamps, "archived"),
            };
            const without = get().sessionHistory.filter((h) => h.id !== current.id);
            set({
              sessionHistory: [archived, ...without.filter((h) => h.id !== fromHistory.id)].slice(0, MAX_HISTORY),
            });
          }
          set({ active: normalizeSession(fromHistory), recipeDirty: false });
          get().showToast(`Loaded heat ${fromHistory.heatNumber || "session"}`);
        }
      },

      clearHeat: () => {
        const { active, sessionHistory } = get();
        const heatRecordId = active?.heatRecordId;
        if (active?.prediction) {
          const archived = {
            ...active,
            archived: true,
            lifecycleTimestamps: recordLifecycleTimestamp(active.lifecycleTimestamps, "archived"),
          };
          const without = sessionHistory.filter((h) => h.id !== active.id);
          set({
            active: null,
            recipeDirty: false,
            sessionHistory: [archived, ...without].slice(0, MAX_HISTORY),
          });
        } else {
          set({ active: null, recipeDirty: false });
        }
        // Freeze the SQLite row so the next heat with a reused heat_number cannot upsert over it.
        if (heatRecordId) {
          void import("@/lib/heat-history-sync").then((m) => m.archiveHeatRecord(heatRecordId));
        }
      },

      hasActiveHeat: () => {
        const active = get().active;
        return !!active?.prediction;
      },

      setPanelCollapsed: (panelCollapsed) => set({ panelCollapsed }),
      setMobileSheetOpen: (mobileSheetOpen) => set({ mobileSheetOpen }),

      recordReportExport: () => {
        const active = get().active;
        if (!active) return;
        set({
          operatorActivity: touchOperatorActivity(get().operatorActivity, {
            heatId: active.id,
            heatNumber: active.heatNumber,
            action: "report",
          }),
        });
      },

      showToast: (message) => {
        set({ toast: message });
        setTimeout(() => {
          if (get().toast === message) set({ toast: null });
        }, 3200);
      },

      clearToast: () => set({ toast: null }),
    }),
    {
      name: "jspl-current-heat",
      partialize: (state) => ({
        active: state.active,
        sessionHistory: state.sessionHistory,
        operatorActivity: state.operatorActivity,
      }),
    }
  )
);

export function formatHeatAge(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString();
}

export function currentCharge(recipe: EafRecipe): number {
  return recipe.HM + recipe.DRI + recipe.HBI + recipe.Bucket;
}
