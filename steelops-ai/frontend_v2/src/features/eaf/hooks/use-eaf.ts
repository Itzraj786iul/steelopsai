"use client";

import { useCallback, useEffect, useState } from "react";

import { DEFAULT_RECIPE, eafApi, type EafRecipe, type ModelInfoResponse, type OptimizeResponse, type PredictResponse } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { useEafHistoryStore } from "@/stores/eaf-history-store";

export function useEafRecipe(initial: EafRecipe = DEFAULT_RECIPE) {
  const [recipe, setRecipe] = useState<EafRecipe>(initial);
  const update = useCallback(<K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => {
    setRecipe((r) => ({ ...r, [key]: value }));
  }, []);
  const charge = recipe.HM + recipe.DRI + recipe.HBI + recipe.Bucket;
  return { recipe, setRecipe, update, charge };
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
  const addPrediction = useEafHistoryStore((s) => s.addPrediction);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);

  const predict = useCallback(
    async (recipe: EafRecipe) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await eafApi.predict(recipe);
        setResult(data);
        addPrediction({
          predictedTtt: data.predicted_ttt,
          ciLower: data.ci_lower_95,
          ciUpper: data.ci_upper_95,
          confidence: data.operator_summary?.confidence ?? "—",
        });
        return data;
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Prediction failed");
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [addPrediction]
  );

  return { predict, loading, error, result };
}

export function useEafOptimize() {
  const addOptimization = useEafHistoryStore((s) => s.addOptimization);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResponse | null>(null);

  const optimize = useCallback(
    async (recipe: EafRecipe) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await eafApi.optimize(recipe);
        setResult(data);
        addOptimization({
          currentTtt: data.current_ttt,
          optimizedTtt: data.optimized_ttt,
          savingMin: data.improvement_min,
        });
        return data;
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "Optimization failed");
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [addOptimization]
  );

  return { optimize, loading, error, result };
}

export function useEafDashboard(recipe: EafRecipe = DEFAULT_RECIPE) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<ModelInfoResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [optimization, setOptimization] = useState<OptimizeResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      eafApi.modelInfo().then(({ data }) => data),
      eafApi.predict(recipe).then(({ data }) => data),
      eafApi.optimize(recipe).then(({ data }) => data),
    ])
      .then(([modelInfo, predictResult, optimizeResult]) => {
        if (cancelled) return;
        setModel(modelInfo);
        setPrediction(predictResult);
        setOptimization(optimizeResult);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Failed to load dashboard data"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recipe]);

  return { loading, error, model, prediction, optimization };
}
