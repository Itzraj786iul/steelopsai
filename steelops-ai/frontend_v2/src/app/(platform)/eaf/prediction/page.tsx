"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { ConfidenceRing } from "@/components/industrial/gauges";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";

export default function EafPredictionPage() {
  const { recipe, update, charge } = useEafRecipe();
  const { predict, loading, error, result } = useEafPredict();

  return (
    <PageContainer title="TTT Prediction" description="Predict tap-to-tap time from heat inputs">
      <RecipeForm recipe={recipe} onChange={update} charge={charge} />
      {result?.validation_warnings?.length ? (
        <div className="mt-4 space-y-2">
          {result.validation_warnings.map((w, i) => (
            <p key={i} className={`rounded-lg px-4 py-2 text-sm ${w.level === "error" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-800"}`}>
              {w.message}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-6 flex gap-4">
        <Button onClick={() => predict(recipe)} disabled={loading}>
          {loading ? "Predicting…" : "Predict TTT"}
        </Button>
      </div>
      {error ? <p className="mt-4 text-destructive">{error}</p> : null}
      {result ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <SectionCard title="Predicted Tap-to-Tap" className="flex flex-col items-center justify-center py-8">
            <p className="font-mono text-5xl font-bold tracking-tight text-primary">{result.predicted_ttt.toFixed(2)}</p>
            <p className="mt-2 text-muted-foreground">minutes</p>
            <p className="mt-4 text-sm">95% interval: {result.ci_lower_95.toFixed(1)} – {result.ci_upper_95.toFixed(1)} min</p>
            <div className="mt-6">
              <ConfidenceRing score={85} tier={result.operator_summary?.confidence?.toUpperCase() ?? "HIGH"} />
            </div>
          </SectionCard>
          <SectionCard title="Top Contributors">
            <ul className="space-y-2 text-sm">
              {result.top_contributors?.slice(0, 5).map((c) => (
                <li key={c.feature} className="flex justify-between border-b border-border/50 py-2">
                  <span>{c.display_name ?? c.feature}</span>
                  <span className="font-mono">{c.contribution?.toFixed(3)}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      ) : null}
    </PageContainer>
  );
}
