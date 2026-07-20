"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { TttComparisonBars } from "@/features/eaf/components/prediction-visuals";
import type { PredictResponse } from "@/lib/api/eaf";
import { INDUSTRIAL_STATUS, confidenceStatus } from "@/lib/industrial-colors";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

interface PredictionCompleteDashboardProps {
  result: PredictResponse;
  historicalSimilarityPct?: number | null;
  active?: HeatSessionSnapshot | null;
  /** Skip duplicate workflow strip / next-actions when page already shows them. */
  compact?: boolean;
}

export function PredictionCompleteDashboard({
  result,
  historicalSimilarityPct,
  active = null,
  compact = false,
}: PredictionCompleteDashboardProps) {
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
  const bestSimilar = [...(result.explainability?.similar_heats ?? [])].sort(
    (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.similarity_pct - a.similarity_pct
  )[0];
  const histActual = bestSimilar?.actual_ttt ?? null;
  const bench = result.explainability?.neighbor_benchmark ?? null;
  const calibrated = result.neighbor_calibrated_ttt ?? null;

  return (
    <motion.div className="min-w-0" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="min-w-0">
        <SectionCard
          title="Prediction result"
          description={compact ? "Predicted TTT vs similar historical heat" : undefined}
          className={INDUSTRIAL_STATUS.prediction.className}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <p className="text-xs uppercase text-muted-foreground">Predicted TTT</p>
              <p className="break-words font-mono text-3xl font-bold text-blue-700 dark:text-blue-400 sm:text-4xl">
                {result.predicted_ttt.toFixed(2)}{" "}
                <span className="text-lg font-semibold sm:text-xl">min</span>
              </p>
              {calibrated != null ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Neighbour-informed:{" "}
                  <span className="font-mono text-foreground">{calibrated.toFixed(2)} min</span>
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase text-muted-foreground">95% Interval</p>
              <p className="break-words font-mono text-lg font-semibold sm:text-xl">
                {result.ci_lower_95.toFixed(1)} – {result.ci_upper_95.toFixed(1)} min
              </p>
              {bench ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Neighbour band:{" "}
                  <span className="font-mono text-foreground">
                    {bench.min_actual_ttt.toFixed(1)}–{bench.max_actual_ttt.toFixed(1)}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase text-muted-foreground">Confidence</p>
              <Badge className={cn("mt-1", INDUSTRIAL_STATUS[confKey].className)}>{confidence}</Badge>
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase text-muted-foreground">Closest similar heat</p>
              <p className="font-mono text-xl font-semibold">
                {similarity != null ? `${similarity.toFixed(0)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bestSimilar
                  ? `Heat ${bestSimilar.heat_id}${histActual != null ? ` · actual ${histActual.toFixed(1)} min` : ""}`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5 min-w-0">
            <TttComparisonBars
              historicalActual={histActual}
              predicted={result.predicted_ttt}
              optimized={active?.optimizer?.optimized_ttt ?? null}
            />
          </div>

          {!compact ? (
            <div className="mt-4">
              <Link href="/eaf/optimizer" className="text-sm font-medium text-primary hover:underline">
                Continue to Optimizer →
              </Link>
            </div>
          ) : null}
        </SectionCard>
      </motion.div>
    </motion.div>
  );
}
