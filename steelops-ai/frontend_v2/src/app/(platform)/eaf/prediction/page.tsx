"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { PredictionConfidence } from "@/features/eaf/components/prediction-confidence";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import { useEafHistorical } from "@/features/eaf/hooks/use-eaf-historical";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { assessCharge } from "@/lib/charge-validation";

export default function EafPredictionPage() {
  const { recipe, update, charge } = useEafRecipe();
  const { predict, loading, error, result } = useEafPredict();
  const { data: historical } = useEafHistorical(recipe);
  const chargeAssessment = assessCharge(charge, historical?.variables);

  const apiWarnings =
    result?.validation_warnings
      ?.filter((w) => w.level !== "error")
      .map((w) => w.message) ?? [];

  return (
    <PageContainer title="Prediction" description="Predict tap-to-tap time from heat recipe inputs with confidence intervals">
      <RecipeForm recipe={recipe} onChange={update} charge={charge} historicalVariables={historical?.variables} />
      <ValidationBanner messages={[...chargeAssessment.warnings, ...apiWarnings]} />
      <div className="mt-6 flex gap-4">
        <Button onClick={() => predict(recipe)} disabled={loading}>
          {loading ? "Predicting…" : "Predict TTT"}
        </Button>
      </div>
      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Predicted Tap-to-Tap" className="flex flex-col items-center justify-center py-8">
            <p className="font-mono text-5xl font-bold tracking-tight text-primary">{result.predicted_ttt.toFixed(2)}</p>
            <p className="mt-2 text-muted-foreground">minutes</p>
            <p className="mt-4 text-sm">
              95% interval: {result.ci_lower_95.toFixed(1)} – {result.ci_upper_95.toFixed(1)} min
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Model confidence: {result.operator_summary?.confidence ?? chargeAssessment.confidence}
            </p>
          </SectionCard>
          <ContributorList contributors={result.top_contributors ?? []} />
          <PredictionConfidence
            className="lg:col-span-2"
            tier={chargeAssessment.confidence}
            score={chargeAssessment.confidenceScore}
            charge={charge}
            bounds={chargeAssessment.bounds}
          />
        </div>
      ) : null}
    </PageContainer>
  );
}
