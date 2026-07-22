"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { PredictionShimmer } from "@/components/feedback/loading-skeleton";
import { TermTip } from "@/components/feedback/term-tip";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import {
  OperatorStickyActionBar,
  OperatorWorkSurface,
} from "@/features/eaf/components/operator-work-surface";
import { PredictionCompleteDashboard } from "@/features/eaf/components/prediction-complete-dashboard";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { SimilarHistoricalHeatCard } from "@/features/eaf/components/similar-historical-heat-card";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { PAGE_EXPLAINERS, TTT } from "@/lib/eaf-glossary";
import { isHeatPathComplete } from "@/lib/heat-lifecycle";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafPredictionPage() {
  const { recipe, update, charge, heatNumber, setHeatNumber, setRecipe } = useEafRecipe();
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
    if (!heatNumber.trim()) return;
    predict(recipe, heatNumber.trim());
  };

  return (
    <PageContainer
      density="operator"
      eyebrow="Step 1 of 4 · Operator flow"
      title="Predict cycle time"
      description={
        <>
          Enter heat ID + charge mix. The model estimates <TermTip term={TTT} /> in minutes — advice only.
        </>
      }
    >
      <OperatorWorkSurface>
        <HeatWorkflowStrip active={active} currentPage="predict" />
        <PageExplainer
          title={PAGE_EXPLAINERS.prediction.title}
          body={PAGE_EXPLAINERS.prediction.body}
          steps={PAGE_EXPLAINERS.prediction.steps}
        />

        {sessionComplete ? (
          <PageAlert
            tone="success"
            title={`Heat ${active?.heatNumber || "session"} is already saved`}
            actions={<NewHeatButton variant="default" />}
          >
            Start a new heat before entering the next recipe — this keeps history clean.
          </PageAlert>
        ) : null}

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-start">
          <div className="min-w-0 space-y-4">
            <SectionCard
              tone="emphasis"
              title="Heat identity"
              description="Plant batch ID first — required before predict."
            >
              <div className="max-w-md space-y-1.5">
                <Label htmlFor="heat-number" className="leading-snug">
                  <span className="block text-sm font-medium">
                    Heat number <span className="text-destructive">*</span>
                  </span>
                  <span className="text-[11px] font-normal text-muted-foreground">
                    Shop-floor / MES ID · e.g. 4618213
                  </span>
                </Label>
                <Input
                  id="heat-number"
                  className="operator-primary-input"
                  placeholder="e.g. 4618213"
                  value={heatNumber}
                  onChange={(e) => setHeatNumber(e.target.value)}
                  disabled={sessionComplete}
                  autoComplete="off"
                />
              </div>
            </SectionCard>

            <RecipeForm
              recipe={recipe}
              onChange={update}
              charge={charge}
              onReplaceRecipe={setRecipe}
            />
            <ValidationBanner messages={apiWarnings} />
          </div>

          <div className="min-w-0 space-y-4 xl:sticky xl:top-20">
            {loading ? <PredictionShimmer /> : null}
            {error ? <PageAlert tone="error">{error}</PageAlert> : null}

            {result && !sessionComplete ? (
              <motion.div
                key={result.predicted_ttt + String(result.ci_lower_95)}
                className="min-w-0 space-y-4"
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
                    <details className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Similar past heats (optional)
                      </summary>
                      <div className="mt-3">
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

                <motion.div
                  variants={fadeUp}
                  className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm text-muted-foreground">
                    Next: ask for a safer / faster charge mix.
                  </p>
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link href="/eaf/optimizer">Continue to Optimize →</Link>
                  </Button>
                </motion.div>
              </motion.div>
            ) : !loading && !sessionComplete ? (
              <SectionCard tone="panel" title="Result area">
                <p className="text-sm text-muted-foreground">
                  After you press <span className="font-medium text-foreground">Predict cycle time</span>, the
                  minute estimate, confidence, and similar-heat check appear here.
                </p>
              </SectionCard>
            ) : null}
          </div>
        </div>

        <OperatorStickyActionBar>
          <Button
            size="lg"
            onClick={handlePredict}
            disabled={loading || sessionComplete || !heatNumber.trim()}
          >
            {loading ? "Estimating cycle time…" : "Predict cycle time"}
          </Button>
          {!heatNumber.trim() && !sessionComplete ? (
            <p className="text-sm text-warning">Enter a heat number first.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Result is minutes of furnace time · human decides next steps
            </p>
          )}
        </OperatorStickyActionBar>
      </OperatorWorkSurface>
    </PageContainer>
  );
}
