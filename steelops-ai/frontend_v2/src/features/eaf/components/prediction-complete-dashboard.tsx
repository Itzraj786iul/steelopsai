"use client";

import { ArrowRight } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import type { PredictResponse } from "@/lib/api/eaf";
import { INDUSTRIAL_STATUS, confidenceStatus } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";

interface PredictionCompleteDashboardProps {
  result: PredictResponse;
  historicalSimilarityPct?: number | null;
}

export function PredictionCompleteDashboard({ result, historicalSimilarityPct }: PredictionCompleteDashboardProps) {
  const confidence =
    result.confidence ??
    result.operator_summary?.confidence ??
    result.explainability?.prediction_quality ??
    "—";
  const confKey = confidenceStatus(typeof confidence === "string" ? confidence : null);
  const similarity =
    historicalSimilarityPct ??
    result.explainability?.historical_similarity_pct ??
    result.explainability?.similar_heats?.[0]?.similarity_pct ??
    null;

  return (
    <div className="space-y-4">
      <SectionCard
        title="Prediction Complete"
        description="Recipe saved to the current heat session"
        className={INDUSTRIAL_STATUS.prediction.className}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Predicted TTT</p>
            <p className="font-mono text-4xl font-bold text-blue-700 dark:text-blue-400">
              {result.predicted_ttt.toFixed(2)} min
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">95% Interval</p>
            <p className="font-mono text-xl font-semibold">
              {result.ci_lower_95.toFixed(1)} – {result.ci_upper_95.toFixed(1)} min
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Confidence</p>
            <Badge className={cn("mt-1", INDUSTRIAL_STATUS[confKey].className)}>{confidence}</Badge>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Historical Similarity</p>
            <p className="font-mono text-xl font-semibold">
              {similarity != null ? `${similarity.toFixed(0)}%` : "—"}
            </p>
          </div>
        </div>
      </SectionCard>

      <p className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        Continue the workflow from the sidebar: Optimizer → Validation → Reports.
      </p>
    </div>
  );
}
