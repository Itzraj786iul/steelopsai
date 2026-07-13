"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { DigitalTwinReadinessCard } from "@/features/eaf/components/digital-twin-readiness-card";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { FullRecommendationExplanation } from "@/features/eaf/components/full-recommendation-explanation";
import { OptimizerChangeCards } from "@/features/eaf/components/optimizer-change-cards";
import { ShapInterpretations } from "@/features/eaf/components/shap-interpretations";
import { SimilarHistoricalHeatCard } from "@/features/eaf/components/similar-historical-heat-card";
import { TrustFrameworkPanel } from "@/features/eaf/components/trust-framework-panel";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export function ExplainabilityCenterView() {
  const active = useCurrentHeatStore((s) => s.active);

  if (!active?.prediction) {
    return (
      <PageContainer title="Explainability Center" description="Unified prediction and recommendation explanations">
        <EmptyHeatState />
      </PageContainer>
    );
  }

  const prediction = active.prediction;
  const optimizer = active.optimizer;
  const hybrid = active.hybrid;
  const explain = prediction.explainability;
  const optExplain = optimizer?.explainability;

  return (
    <PageContainer title="Explainability Center" description="All explainability for the current heat in one place">
      <div className="space-y-6">
        <SectionCard title="Prediction Explanation">
          <div className="grid gap-4 sm:grid-cols-3">
            <div><p className="text-xs text-muted-foreground">Predicted TTT</p><p className="font-mono text-2xl font-bold text-primary">{prediction.predicted_ttt.toFixed(2)} min</p></div>
            <div><p className="text-xs text-muted-foreground">Confidence</p><p className="text-lg font-semibold">{active.confidence ?? "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Quality</p><p className="text-lg font-semibold">{explain?.prediction_quality ?? "—"}</p></div>
          </div>
        </SectionCard>

        <SectionCard title="SHAP & Industrial Explanation">
          <ContributorList contributors={prediction.top_contributors ?? []} />
          <div className="mt-4">
            <ShapInterpretations contributors={explain?.contributor_interpretations ?? prediction.top_contributors ?? []} />
          </div>
        </SectionCard>

        <SimilarHistoricalHeatCard
          heats={explain?.similar_heats ?? []}
          predictedTtt={prediction.predicted_ttt}
          currentRecipe={active.recipe}
          optimizer={optimizer}
        />

        {hybrid ? <TrustFrameworkPanel trust={hybrid} /> : null}

        <SectionCard title="Hybrid Agreement">
          {hybrid ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Reliability Index</dt><dd className="font-mono font-semibold">{hybrid.reliability_index.toFixed(1)} / 100</dd></div>
              <div><dt className="text-muted-foreground">Consensus</dt><dd>{hybrid.consensus}</dd></div>
              <div><dt className="text-muted-foreground">Agreement</dt><dd className="font-mono">{hybrid.agreement_pct?.toFixed(0) ?? "—"}%</dd></div>
              <div><dt className="text-muted-foreground">Hybrid Score</dt><dd className="font-mono">{hybrid.hybrid_score?.toFixed(1) ?? "—"}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Run prediction to evaluate hybrid agreement.</p>
          )}
        </SectionCard>

        <SectionCard title="Physics Rules">
          <p className="text-sm">Optimizer physics compliance: <strong>{optimizer?.physics_compliant ? "YES" : optimizer ? "NO" : "Not run"}</strong></p>
          {optExplain?.validated_recommendations?.length ? (
            <p className="mt-2 text-sm text-muted-foreground">{optExplain.validated_recommendations.length} validated burden adjustments within historical bands.</p>
          ) : null}
        </SectionCard>

        {optimizer ? (
          <>
            <SectionCard title="Recommendation Logic">
              <FullRecommendationExplanation explanation={optExplain?.recommendation_narrative ? { narrative_lines: optExplain.recommendation_narrative } : undefined} />
            </SectionCard>
            <OptimizerChangeCards rows={optExplain?.validated_recommendations ?? optimizer.comparison} physicsCompliant={optimizer.physics_compliant} />
          </>
        ) : null}

        <SectionCard title="Operator Notes">
          <p className="text-sm text-muted-foreground">{active.validation?.operatorComments || "No operator comments recorded."}</p>
          {active.recommendationAcceptance ? <p className="mt-2 text-sm">Recommendation decision: <strong>{active.recommendationAcceptance}</strong></p> : null}
        </SectionCard>

        <DigitalTwinReadinessCard readiness={explain?.digital_twin_readiness} />
      </div>
    </PageContainer>
  );
}
