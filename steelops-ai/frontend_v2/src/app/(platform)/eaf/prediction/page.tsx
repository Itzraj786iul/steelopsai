"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { PredictionCompleteDashboard } from "@/features/eaf/components/prediction-complete-dashboard";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { SimilarHistoricalHeatCard } from "@/features/eaf/components/similar-historical-heat-card";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { isHeatPathComplete } from "@/lib/heat-lifecycle";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafPredictionPage() {
  const { recipe, update, charge, heatNumber, setHeatNumber } = useEafRecipe();
  const { predict, loading, error, result } = useEafPredict();
  const active = useCurrentHeatStore((s) => s.active);
  const explain = result?.explainability;
  const sessionComplete = isHeatPathComplete(active);

  const apiWarnings =
    result?.validation_warnings
      ?.filter((w) => w.level !== "error")
      .map((w) => w.message) ?? [];

  const handlePredict = () => {
    if (sessionComplete) return;
    predict(recipe, heatNumber);
  };

  return (
    <PageContainer title="Prediction" description="Enter heat recipe → predict TTT → continue to Optimizer">
      <HeatWorkflowStrip active={active} currentPage="predict" className="mt-4" />

      {sessionComplete ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Heat {active?.heatNumber || "session"} is already saved
            </p>
            <p className="text-sm text-muted-foreground">
              Start a new heat before entering the next recipe — this keeps history clean.
            </p>
          </div>
          <NewHeatButton variant="default" />
        </div>
      ) : null}

      <SectionCard title="Heat input" className="mt-6" description="Heat number and burden recipe">
        <div className="mb-4 max-w-xs space-y-2">
          <Label htmlFor="heat-number">Heat Number</Label>
          <Input
            id="heat-number"
            placeholder="e.g. 4618213"
            value={heatNumber}
            onChange={(e) => setHeatNumber(e.target.value)}
            disabled={sessionComplete}
          />
        </div>
        <RecipeForm recipe={recipe} onChange={update} charge={charge} />
        <ValidationBanner messages={apiWarnings} />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={handlePredict} disabled={loading || sessionComplete}>
            {loading ? "Predicting…" : "Predict TTT"}
          </Button>
        </div>
        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </SectionCard>

      {result && !sessionComplete ? (
        <motion.div
          key={result.predicted_ttt + String(result.ci_lower_95)}
          className="mt-6 min-w-0 space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeUp}>
            <PredictionCompleteDashboard
              result={result}
              historicalSimilarityPct={explain?.historical_similarity_pct}
              active={active}
              compact
            />
          </motion.div>

          {(explain?.similar_heats?.length ?? 0) > 0 ? (
            <motion.div variants={fadeUp}>
              <details className="rounded-lg border border-border/60 bg-muted/10 p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Similar historical heats (optional)
                </summary>
                <div className="mt-4">
                  <SimilarHistoricalHeatCard
                    heats={explain?.similar_heats ?? []}
                    predictedTtt={result.predicted_ttt}
                    currentRecipe={recipe}
                    optimizer={active?.optimizer ?? null}
                    neighborBenchmark={explain?.neighbor_benchmark}
                    neighborCalibratedTtt={result.neighbor_calibrated_ttt}
                    showExploreLink={false}
                  />
                </div>
              </details>
            </motion.div>
          ) : null}

          <motion.div variants={fadeUp} className="flex justify-end">
            <Button asChild size="lg">
              <Link href="/eaf/optimizer">Continue to Optimizer →</Link>
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </PageContainer>
  );
}
