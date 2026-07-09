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

export interface HeatValidationState {
  actualTtt?: string;
  optimizerUsed?: string;
  recommendationApplied?: string;
  operatorComments?: string;
}

export interface HeatSessionSnapshot {
  id: string;
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
}

const MAX_HISTORY = 20;

function emptySession(recipe: EafRecipe = DEFAULT_RECIPE, heatNumber = ""): HeatSessionSnapshot {
  return {
    id: crypto.randomUUID(),
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
  };
}

function recipesEqual(a: EafRecipe, b: EafRecipe): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface CurrentHeatState {
  active: HeatSessionSnapshot | null;
  sessionHistory: HeatSessionSnapshot[];
  drawerOpen: boolean;
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
  saveHeat: () => void;
  loadHeat: (id: string) => void;
  clearHeat: () => void;
  hasActiveHeat: () => boolean;
  setDrawerOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

export const useCurrentHeatStore = create<CurrentHeatState>()(
  persist(
    (set, get) => ({
      active: null,
      sessionHistory: [],
      drawerOpen: false,
      toast: null,
      recipeDirty: false,

      setHeatNumber: (heatNumber) => {
        const active = get().active;
        if (!active) {
          set({ active: { ...emptySession(), heatNumber, lastUpdated: new Date().toISOString() } });
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
            ...(changed
              ? {
                  prediction: null,
                  hybrid: null,
                  optimizer: null,
                  optimizerV2: null,
                  confidence: null,
                  warnings: [],
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
        set({
          active: {
            ...active,
            prediction,
            hybrid,
            confidence,
            warnings,
            shift: active.recipe.Shift,
            lastUpdated: new Date().toISOString(),
          },
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
          },
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
        set({
          active: {
            ...active,
            validation,
            lastUpdated: new Date().toISOString(),
          },
        });
        get().saveHeat();
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
        const fromHistory = get().sessionHistory.find((h) => h.id === id);
        if (fromHistory) {
          set({ active: { ...fromHistory }, recipeDirty: false });
          get().showToast(`Loaded heat ${fromHistory.heatNumber || "session"}`);
          return;
        }
        if (get().active?.id === id) return;
      },

      clearHeat: () => {
        set({ active: null, recipeDirty: false });
      },

      hasActiveHeat: () => {
        const active = get().active;
        return !!active?.prediction;
      },

      setDrawerOpen: (drawerOpen) => set({ drawerOpen }),

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
