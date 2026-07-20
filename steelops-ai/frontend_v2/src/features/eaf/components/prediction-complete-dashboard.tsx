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
  const savedId = result.metadata?.heat_record_id;

  return (
    <motion.div className="min-w-0" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="min-w-0">
        <SectionCard
          title="Your cycle-time estimate"
          description={
            compact
              ? "How long this heat is expected to take (minutes) — compared with a similar past heat"
              : undefined
          }
          className={INDUSTRIAL_STATUS.prediction.className}
        >
          <div className="space-y-6">
            <div className="min-w-0 rounded-xl border border-prediction/25 bg-background/60 p-4 sm:p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Predicted cycle time
              </p>
              <p className="mt-1 break-words font-mono text-4xl font-bold text-prediction sm:text-5xl">
                {result.predicted_ttt.toFixed(1)}{" "}
                <span className="text-xl font-semibold text-muted-foreground sm:text-2xl">min</span>
              </p>
              {calibrated != null ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Adjusted from similar heats:{" "}
                  <span className="font-mono text-foreground">{calibrated.toFixed(1)} min</span>
                </p>
              ) : null}
              {savedId ? (
                <p className="mt-3 text-sm text-success">
                  Saved to{" "}
                  <Link href="/eaf/heat-history" className="font-medium underline underline-offset-2">
                    Heat History
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="min-w-0 rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs uppercase text-muted-foreground">Likely range (95%)</p>
                <p className="mt-1 break-words font-mono text-lg font-semibold">
                  {result.ci_lower_95.toFixed(1)} – {result.ci_upper_95.toFixed(1)} min
                </p>
                {bench ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Similar-heats range:{" "}
                    <span className="font-mono text-foreground">
                      {bench.min_actual_ttt.toFixed(1)}–{bench.max_actual_ttt.toFixed(1)}
                    </span>
                  </p>
                ) : null}
              </div>
              <div className="min-w-0 rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs uppercase text-muted-foreground">Confidence</p>
                <Badge className={cn("mt-2", INDUSTRIAL_STATUS[confKey].className)}>{confidence}</Badge>
              </div>
              <div className="min-w-0 rounded-lg border border-border/50 bg-muted/10 p-3">
                <p className="text-xs uppercase text-muted-foreground">Closest similar heat</p>
                <p className="mt-1 font-mono text-xl font-semibold">
                  {similarity != null ? `${similarity.toFixed(0)}%` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {bestSimilar
                    ? `Heat ${bestSimilar.heat_id}${histActual != null ? ` · actual ${histActual.toFixed(1)} min` : ""}`
                    : "—"}
                </p>
              </div>
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
                Continue to Optimize →
              </Link>
            </div>
          ) : null}
        </SectionCard>
      </motion.div>
    </motion.div>
  );
}
