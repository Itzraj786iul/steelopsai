"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { CurrentHeatBanner } from "@/features/eaf/components/current-heat-banner";
import { DigitalTwinReadinessCard } from "@/features/eaf/components/digital-twin-readiness-card";
import { PredictionQualityBadge } from "@/features/eaf/components/prediction-quality-badge";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { ShapInterpretations } from "@/features/eaf/components/shap-interpretations";
import { SimilarHeatsPanel } from "@/features/eaf/components/similar-heats-panel";
import { TrustFrameworkPanel } from "@/features/eaf/components/trust-framework-panel";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import type { HybridTrustResponse } from "@/lib/api/eaf";
import { assessCharge } from "@/lib/charge-validation";

export default function EafPredictionPage() {
  const { recipe, update, charge, heatNumber, setHeatNumber } = useEafRecipe();
  const { predict, loading, error, result } = useEafPredict();
  const chargeAssessment = assessCharge(charge);
  const explain = result?.explainability;
  const hybrid = (result as { hybrid_trust?: HybridTrustResponse } | null)?.hybrid_trust;

  const apiWarnings =
    result?.validation_warnings
      ?.filter((w) => w.level !== "error")
      .map((w) => w.message) ?? [];

  return (
    <PageContainer title="Prediction" description="Enter recipe once — results flow to Optimizer, What-if, and Reports">
      <CurrentHeatBanner sticky={false} showActions={false} />

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
      <div className="mt-6 flex gap-4">
        <Button onClick={() => predict(recipe, heatNumber)} disabled={loading}>
          {loading ? "Predicting…" : "Predict TTT"}
        </Button>
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap gap-2">
            <PredictionQualityBadge quality={explain?.prediction_quality} />
            {hybrid ? (
              <span className="text-sm text-muted-foreground">
                Reliability Index: {hybrid.reliability_index.toFixed(1)} / 100
              </span>
            ) : null}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="Predicted Tap-to-Tap" className="flex flex-col items-center justify-center py-8">
              <p className="font-mono text-5xl font-bold tracking-tight text-primary">{result.predicted_ttt.toFixed(2)}</p>
              <p className="mt-2 text-muted-foreground">minutes</p>
              <p className="mt-4 text-sm">
                95% interval: {result.ci_lower_95.toFixed(1)} – {result.ci_upper_95.toFixed(1)} min
              </p>
            </SectionCard>
            {hybrid ? <TrustFrameworkPanel trust={hybrid} /> : null}
            <ContributorList contributors={result.top_contributors ?? []} />
          </div>
          <SimilarHeatsPanel heats={explain?.similar_heats ?? []} />
          <ShapInterpretations contributors={explain?.contributor_interpretations ?? result.top_contributors ?? []} />
          <DigitalTwinReadinessCard readiness={explain?.digital_twin_readiness} />
        </div>
      ) : null}
    </PageContainer>
  );
}
