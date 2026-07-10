"use client";

import { useCallback, useState } from "react";

import { eafApi, type EafRecipe, type HistoricalResponse } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

/** Historical comparison — manual fetch only (no API calls on page navigation). */
export function useEafHistorical() {
  const [data, setData] = useState<HistoricalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (recipe: EafRecipe) => {
    setLoading(true);
    setError(null);
    try {
      const { data: response } = await eafApi.historical(recipe);
      setData(response);
      return response;
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "Historical comparison unavailable");
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, refresh };
}
