"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { PredictionNextActions } from "@/features/eaf/components/prediction-next-actions";
import { TrustMeterGauge, TttComparisonBars } from "@/features/eaf/components/prediction-visuals";
import type { PredictResponse } from "@/lib/api/eaf";
import { INDUSTRIAL_STATUS, confidenceStatus } from "@/lib/industrial-colors";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

interface PredictionCompleteDashboardProps {
  result: PredictResponse;
  historicalSimilarityPct?: number | null;
  active?: HeatSessionSnapshot | null;
}

export function PredictionCompleteDashboard({
  result,
  historicalSimilarityPct,
  active = null,
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
  const reliability =
    active?.hybrid?.reliability_index ??
    (result as { hybrid_trust?: { reliability_index?: number } }).hybrid_trust?.reliability_index ??
    null;

  return (
    <motion.div className="min-w-0 space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp} className="min-w-0">
        <HeatWorkflowStrip active={active} currentPage="predict" />
      </motion.div>

      <motion.div variants={fadeUp} className="min-w-0">
        <SectionCard
          title="Prediction Complete"
          description="Heat session saved — compare TTT with similar historical heats, then follow the workflow strip"
          className={INDUSTRIAL_STATUS.prediction.className}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
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
                  </span>{" "}
                  ({bench.n} heats)
                </p>
              ) : null}
            </div>
            <Link href="/eaf/reliability" className="min-w-0 rounded-lg focus-ring">
              <p className="text-xs uppercase text-muted-foreground">Confidence</p>
              <Badge className={cn("mt-1", INDUSTRIAL_STATUS[confKey].className)}>{confidence}</Badge>
              <p className="mt-1 text-xs text-primary">Open reliability →</p>
            </Link>
            <Link href="/eaf/historical" className="min-w-0 rounded-lg focus-ring">
              <p className="text-xs uppercase text-muted-foreground">Closest similar heat</p>
              <p className="font-mono text-xl font-semibold">
                {similarity != null ? `${similarity.toFixed(0)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {bestSimilar
                  ? `Heat ${bestSimilar.heat_id}${histActual != null ? ` · actual ${histActual.toFixed(1)} min` : ""}`
                  : "Open historical analysis →"}
              </p>
              {bestSimilar?.truly_similar ? (
                <Badge variant="outline" className="mt-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                  Truly similar
                </Badge>
              ) : null}
            </Link>
          </div>

          <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2">
              <TttComparisonBars
                historicalActual={histActual}
                predicted={result.predicted_ttt}
                optimized={active?.optimizer?.optimized_ttt ?? null}
              />
            </div>
            <div className="min-w-0">
              <TrustMeterGauge value={reliability} />
            </div>
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeUp} className="min-w-0">
        <PredictionNextActions active={active} />
      </motion.div>
    </motion.div>
  );
}
