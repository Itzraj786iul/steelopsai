"use client";

import { useEffect, useState } from "react";

import { eafApi, type EafRecipe, type HistoricalResponse } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

export function useEafHistorical(recipe: EafRecipe) {
  const [data, setData] = useState<HistoricalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    eafApi
      .historical(recipe)
      .then(({ data: response }) => {
        if (!cancelled) setData(response);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(e, "Historical comparison unavailable"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recipe]);

  return { data, loading, error };
}
