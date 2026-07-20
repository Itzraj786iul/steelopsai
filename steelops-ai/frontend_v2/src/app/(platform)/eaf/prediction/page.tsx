"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { TermTip } from "@/components/feedback/term-tip";
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
import { PAGE_EXPLAINERS, TTT } from "@/lib/eaf-glossary";
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
    if (!heatNumber.trim()) return;
    predict(recipe, heatNumber.trim());
  };

  return (
    <PageContainer
      title="Predict cycle time"
      description={
        <>
          Tell the model what this furnace batch looks like — it estimates{" "}
          <TermTip term={TTT} /> in minutes.
        </>
      }
    >
      <HeatWorkflowStrip active={active} currentPage="predict" />
      <PageExplainer {...PAGE_EXPLAINERS.prediction} />

      {sessionComplete ? (
        <PageAlert
          tone="success"
          title={`Heat ${active?.heatNumber || "session"} is already saved`}
          actions={<NewHeatButton variant="default" />}
        >
          Start a new heat before entering the next recipe — this keeps history clean.
        </PageAlert>
      ) : null}

      <SectionCard
        title="Identify the heat"
        description="A heat number is the plant’s ID for one furnace batch. Use a real ID from the shop floor, or a demo number while exploring."
      >
        <div className="mb-2 max-w-sm space-y-1.5">
          <Label htmlFor="heat-number" className="leading-snug">
            <span className="block text-sm font-medium">
              Heat number <span className="text-destructive">*</span>
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">Batch ID · required before predict</span>
          </Label>
          <Input
            id="heat-number"
            placeholder="e.g. 4618213"
            value={heatNumber}
            onChange={(e) => setHeatNumber(e.target.value)}
            disabled={sessionComplete}
          />
          <p className="text-[11px] text-muted-foreground">
            Example format: 7-digit plant heat ID. Visitors can type any demo number like 4618213.
          </p>
        </div>
      </SectionCard>

      <RecipeForm recipe={recipe} onChange={update} charge={charge} />
      <ValidationBanner messages={apiWarnings} />

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={handlePredict} disabled={loading || sessionComplete || !heatNumber.trim()}>
          {loading ? "Estimating cycle time…" : "Predict cycle time"}
        </Button>
        {!heatNumber.trim() && !sessionComplete ? (
          <p className="text-sm text-warning">Enter a heat number first — then press predict.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Result is minutes of furnace time (TTT). Defaults already look like a real heat.
          </p>
        )}
      </div>
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      {result && !sessionComplete ? (
        <motion.div
          key={result.predicted_ttt + String(result.ci_lower_95)}
          className="min-w-0 space-y-6"
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
                  Similar past heats (optional — for metallurgists)
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

          <motion.div variants={fadeUp} className="flex flex-col items-end gap-2 sm:flex-row sm:justify-end sm:items-center">
            <p className="text-sm text-muted-foreground">Next: see if a better charge mix can shorten the cycle.</p>
            <Button asChild size="lg">
              <Link href="/eaf/optimizer">Continue to Optimizer →</Link>
            </Button>
          </motion.div>
        </motion.div>
      ) : null}
    </PageContainer>
  );
}
