"use client";

import { useCallback, useEffect, useState } from "react";

import {
  DEFAULT_RECIPE,
  eafApi,
  type EafRecipe,
  type HybridTrustResponse,
  type ModelInfoResponse,
  type OptimizeResponse,
  type OptimizeV2Response,
  type PredictResponse,
} from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { useAuditStore } from "@/stores/audit-store";
import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { usePerformanceStore } from "@/stores/performance-store";

export function useEafRecipe() {
  const active = useCurrentHeatStore((s) => s.active);
  const setRecipe = useCurrentHeatStore((s) => s.setRecipe);
  const updateRecipeField = useCurrentHeatStore((s) => s.updateRecipeField);
  const setHeatNumber = useCurrentHeatStore((s) => s.setHeatNumber);
  const heatNumber = active?.heatNumber ?? "";
  const recipe = active?.recipe ?? DEFAULT_RECIPE;

  const update = useCallback(
    <K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => {
      updateRecipeField(key, value);
    },
    [updateRecipeField]
  );

  const charge = recipe.HM + recipe.DRI + recipe.HBI + recipe.Bucket;
  return { recipe, setRecipe, update, charge, heatNumber, setHeatNumber };
}

export function useEafModelInfo() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<ModelInfoResponse | null>(null);

  useEffect(() => {
    eafApi
      .modelInfo()
      .then(({ data }) => setInfo(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load model info")))
      .finally(() => setLoading(false));
  }, []);

  return { info, loading, error };
}

export function useEafPredict() {
  const updatePrediction = useCurrentHeatStore((s) => s.updatePrediction);
  const cached = useCurrentHeatStore((s) => s.active?.prediction);
  const cachedHybrid = useCurrentHeatStore((s) => s.active?.hybrid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<(PredictResponse & { hybrid_trust?: HybridTrustResponse }) | null>(
  () =>
      cached
        ? ({
            ...cached,
            hybrid_trust: cachedHybrid ?? undefined,
          } as PredictResponse & { hybrid_trust?: HybridTrustResponse })
        : null
  );

  useEffect(() => {
    if (cached) {
      setResult({
        ...cached,
        hybrid_trust: cachedHybrid ?? undefined,
      } as PredictResponse & { hybrid_trust?: HybridTrustResponse });
    }
  }, [cached, cachedHybrid]);

  const predict = useCallback(
    async (recipe: EafRecipe, heatId = "") => {
      setLoading(true);
      setError(null);
      const start = performance.now();
      try {
        // Show core prediction as soon as ML returns — don't block on hybrid trust.
        const { data } = await eafApi.predict(recipe);
        const warnings =
          data.validation_warnings?.filter((w) => w.level !== "error").map((w) => w.message) ?? [];
        updatePrediction(data, null, warnings);
        setResult(data as PredictResponse & { hybrid_trust?: HybridTrustResponse });
        setLoading(false);

        const elapsed = performance.now() - start;
        usePerformanceStore.getState().record({ type: "prediction", ms: elapsed });

        const active = useCurrentHeatStore.getState().active;
        if (active) {
          const sim =
            data.explainability?.historical_similarity_pct ??
            data.explainability?.similar_heats?.[0]?.similarity_pct ??
            null;
          useAuditStore.getState().recordPrediction({
            heatNumber: heatId || active.heatNumber,
            shift: recipe.Shift,
            inputRecipe: { ...recipe },
            predictedTtt: data.predicted_ttt,
            confidence: data.confidence ?? data.operator_summary?.confidence ?? null,
            similarity: sim,
            operatorDecision: active.recommendationAcceptance,
            validationStatus: active.validation?.actualTtt ? "Recorded" : "Pending",
            heatSessionId: active.id,
          });
        }

        void import("@/lib/heat-history-sync").then((m) => m.syncHeatAfterPrediction());

        void eafApi
          .hybridEvaluate(recipe, heatId)
          .then((hybridRes) => {
            const hybrid = hybridRes.data;
            const hybridElapsed = performance.now() - start;
            usePerformanceStore.getState().record({ type: "hybrid", ms: hybridElapsed });
            updatePrediction(data, hybrid, warnings);
            setResult({ ...data, hybrid_trust: hybrid } as PredictResponse & {
              hybrid_trust?: HybridTrustResponse;
            });
          })
          .catch(() => {
            /* hybrid is optional enrichment */
          });

        return data;
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Prediction failed");
        setError(msg);
        setLoading(false);
        throw e;
      }
    },
    [updatePrediction]
  );

  return { predict, loading, error, result };
}

export function useEafOptimize() {
  const updateOptimizer = useCurrentHeatStore((s) => s.updateOptimizer);
  const cached = useCurrentHeatStore((s) => s.active?.optimizer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResponse | null>(cached ?? null);

  useEffect(() => {
    if (cached) setResult(cached);
  }, [cached]);

  const optimize = useCallback(
    async (recipe: EafRecipe) => {
      setLoading(true);
      setError(null);
      const start = performance.now();
      try {
        const { data } = await eafApi.optimize(recipe);
        setResult(data);
        updateOptimizer(data, undefined);
        usePerformanceStore.getState().record({ type: "optimizer", ms: performance.now() - start });
        const active = useCurrentHeatStore.getState().active;
        if (active) {
          useAuditStore.getState().recordRecommendation({
            heatSessionId: active.id,
            heatNumber: active.heatNumber,
            shift: active.shift,
            originalRecipe: data.current_recipe,
            optimizedRecipe: data.optimized_recipe,
            acceptance: active.recommendationAcceptance,
            finalOperatorRecipe: active.recipe,
            validationOutcome: active.validation?.actualTtt ?? null,
            improvementMin: data.improvement_min,
          });
        }
        void import("@/lib/heat-history-sync").then((m) => m.syncHeatAfterOptimizer());
        return data;
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Optimization failed");
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [updateOptimizer]
  );

  return { optimize, loading, error, result };
}

export function useEafOptimizeV2() {
  const updateOptimizer = useCurrentHeatStore((s) => s.updateOptimizer);
  const cachedProd = useCurrentHeatStore((s) => s.active?.optimizer);
  const cachedV2 = useCurrentHeatStore((s) => s.active?.optimizerV2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeV2Response | null>(cachedV2 ?? null);

  useEffect(() => {
    if (cachedV2) setResult(cachedV2);
  }, [cachedV2]);

  const optimizeV2 = useCallback(
    async (recipe: EafRecipe) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await eafApi.optimizeV2(recipe);
        setResult(data);
        updateOptimizer(cachedProd ?? undefined, data);
        void import("@/lib/heat-history-sync").then((m) => m.syncHeatAfterOptimizer());
        return data;
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Optimizer V2 failed");
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [updateOptimizer, cachedProd]
  );

  return { optimizeV2, loading, error, result };
}

export function useEafDashboard() {
  const active = useCurrentHeatStore((s) => s.active);
  const { info: model, loading: modelLoading, error: modelError } = useEafModelInfo();

  return {
    loading: modelLoading,
    error: modelError,
    model,
    prediction: active?.prediction ?? null,
    optimization: active?.optimizer ?? null,
    hybrid: active?.hybrid ?? null,
    active,
  };
}
