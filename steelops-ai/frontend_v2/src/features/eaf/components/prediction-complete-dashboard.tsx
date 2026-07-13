"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { PredictionNextActions } from "@/features/eaf/components/prediction-next-actions";
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
    (a, b) => b.similarity_pct - a.similarity_pct
  )[0];
  const histActual = bestSimilar?.actual_ttt ?? null;

  return (
    <motion.div className="space-y-4" variants={staggerContainer} initial="initial" animate="animate">
      <motion.div variants={fadeUp}>
        <SectionCard
          title="Prediction Complete"
          description="Heat session saved — compare TTT below, then follow the Operator Heat Console"
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
            <Link href="/eaf/reliability" className="rounded-lg focus-ring">
              <p className="text-xs uppercase text-muted-foreground">Confidence</p>
              <Badge className={cn("mt-1", INDUSTRIAL_STATUS[confKey].className)}>{confidence}</Badge>
              <p className="mt-1 text-xs text-primary">Open reliability →</p>
            </Link>
            <Link href="/eaf/historical" className="rounded-lg focus-ring">
              <p className="text-xs uppercase text-muted-foreground">Historical Similarity</p>
              <p className="font-mono text-xl font-semibold">
                {similarity != null ? `${similarity.toFixed(0)}%` : "—"}
              </p>
              <p className="mt-1 text-xs text-primary">Open historical analysis →</p>
            </Link>
          </div>

          <div className="mt-5">
            <TttComparisonBars
              historicalActual={histActual}
              predicted={result.predicted_ttt}
              optimized={active?.optimizer?.optimized_ttt ?? null}
            />
          </div>
        </SectionCard>
      </motion.div>

      <motion.div variants={fadeUp}>
        <PredictionNextActions active={active} />
      </motion.div>
    </motion.div>
  );
}
