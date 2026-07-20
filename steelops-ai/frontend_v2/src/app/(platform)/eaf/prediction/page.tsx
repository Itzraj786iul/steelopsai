"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { DigitalTwinReadinessCard } from "@/features/eaf/components/digital-twin-readiness-card";
import { HeatLifecycleTimeline } from "@/features/eaf/components/heat-lifecycle-timeline";
import { PredictionCompleteDashboard } from "@/features/eaf/components/prediction-complete-dashboard";
import { PredictionQualityBadge } from "@/features/eaf/components/prediction-quality-badge";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { ShapInterpretations } from "@/features/eaf/components/shap-interpretations";
import { SimilarHistoricalHeatCard } from "@/features/eaf/components/similar-historical-heat-card";
import { TrustFrameworkPanel } from "@/features/eaf/components/trust-framework-panel";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import type { HybridTrustResponse } from "@/lib/api/eaf";
import { assessCharge } from "@/lib/charge-validation";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafPredictionPage() {
  const { recipe, update, charge, heatNumber, setHeatNumber } = useEafRecipe();
  const { predict, loading, error, result } = useEafPredict();
  const active = useCurrentHeatStore((s) => s.active);
  const chargeAssessment = assessCharge(charge);
  const explain = result?.explainability;
  const hybrid = (result as { hybrid_trust?: HybridTrustResponse } | null)?.hybrid_trust;

  const apiWarnings =
    result?.validation_warnings
      ?.filter((w) => w.level !== "error")
      .map((w) => w.message) ?? [];

  return (
    <PageContainer title="Prediction" description="Operator heat workflow — predict once, then continue Optimize → Validate → Feedback from this page">
      <SectionCard title="Heat identification" className="mt-6">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="heat-number">Heat Number</Label>
          <Input
            id="heat-number"
            placeholder="e.g. 4618213"
            value={heatNumber}
            onChange={(e) => setHeatNumber(e.target.value)}
          />
        </div>
      </SectionCard>

      <RecipeForm recipe={recipe} onChange={update} charge={charge} />
      <ValidationBanner messages={[...chargeAssessment.warnings, ...apiWarnings]} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => predict(recipe, heatNumber)} disabled={loading}>
          {loading ? "Predicting…" : "Predict TTT"}
        </Button>
        {result ? (
          <>
            <Button asChild>
              <Link href="/eaf/optimizer">Next → Optimizer</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/eaf/validation">Validation</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/eaf/feedback">Feedback</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/eaf/historical">Historical</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/eaf/whatif">What-if</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/eaf/reports">Reports</Link>
            </Button>
          </>
        ) : null}
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <motion.div
          key={result.predicted_ttt + String(result.ci_lower_95)}
          className="mt-8 min-w-0 space-y-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={fadeUp}>
            <PredictionCompleteDashboard
              result={result}
              historicalSimilarityPct={explain?.historical_similarity_pct}
              active={active}
            />
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-2">
            <PredictionQualityBadge quality={explain?.prediction_quality} />
            {hybrid ? (
              <span className="text-sm text-muted-foreground">
                Reliability Index: {hybrid.reliability_index.toFixed(1)} / 100
              </span>
            ) : null}
          </motion.div>

          {hybrid ? (
            <motion.div variants={fadeUp}>
              <TrustFrameworkPanel trust={hybrid} />
            </motion.div>
          ) : null}
          <motion.div variants={fadeUp}>
            <SimilarHistoricalHeatCard
              heats={explain?.similar_heats ?? []}
              predictedTtt={result.predicted_ttt}
              currentRecipe={recipe}
              optimizer={active?.optimizer ?? null}
              neighborBenchmark={explain?.neighbor_benchmark}
              neighborCalibratedTtt={result.neighbor_calibrated_ttt}
            />
          </motion.div>
          <motion.div variants={fadeUp}>
            <ContributorList contributors={result.top_contributors ?? []} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <ShapInterpretations contributors={explain?.contributor_interpretations ?? result.top_contributors ?? []} />
          </motion.div>
          <motion.div variants={fadeUp}>
            <DigitalTwinReadinessCard readiness={explain?.digital_twin_readiness} />
          </motion.div>
          {active ? (
            <motion.div variants={fadeUp}>
              <HeatLifecycleTimeline active={active} />
            </motion.div>
          ) : null}
        </motion.div>
      ) : null}
    </PageContainer>
  );
}
