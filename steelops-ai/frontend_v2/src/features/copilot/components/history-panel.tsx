"use client";

import { useQuery } from "@tanstack/react-query";

import { predictionApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";

export function HistoryPanel() {
  const historyQuery = useQuery({
    queryKey: queryKeys.prediction.history(20),
    queryFn: async () => (await predictionApi.history(20)).data,
  });

  if (historyQuery.isLoading) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/40" />;
  }

  if (historyQuery.isError) {
    return <p className="text-sm text-muted-foreground">Unable to load prediction history.</p>;
  }

  return (
    <div className="space-y-2">
      {(historyQuery.data ?? []).slice(0, 10).map((item, index) => (
        <div key={index} className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium">{String(item.heat_id ?? item.id ?? `Historical ${index + 1}`)}</p>
          <p className="text-muted-foreground">
            {item.predicted_at_min != null ? `Predicted ${Number(item.predicted_at_min).toFixed(1)} min` : "Prediction record"}
          </p>
        </div>
      ))}
    </div>
  );
}
