"use client";

import { useCallback, useState } from "react";

import { DEFAULT_RECIPE, eafApi, type EafRecipe } from "@/lib/api/eaf";

export function useEafRecipe(initial: EafRecipe = DEFAULT_RECIPE) {
  const [recipe, setRecipe] = useState<EafRecipe>(initial);
  const update = useCallback(<K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => {
    setRecipe((r) => ({ ...r, [key]: value }));
  }, []);
  const charge = recipe.HM + recipe.DRI + recipe.HBI + recipe.Bucket;
  return { recipe, setRecipe, update, charge };
}

export function useEafPredict() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof eafApi.predict>>["data"] | null>(null);

  const predict = useCallback(async (recipe: EafRecipe) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await eafApi.predict(recipe);
      setResult(data);
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Prediction failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { predict, loading, error, result };
}

export function useEafOptimize() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof eafApi.optimize>>["data"] | null>(null);

  const optimize = useCallback(async (recipe: EafRecipe) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await eafApi.optimize(recipe);
      setResult(data);
      return data;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Optimization failed";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { optimize, loading, error, result };
}
