"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DigitalTwinReadinessCard } from "@/features/eaf/components/digital-twin-readiness-card";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { FullRecommendationExplanation } from "@/features/eaf/components/full-recommendation-explanation";
import { HeatLifecycleTimeline } from "@/features/eaf/components/heat-lifecycle-timeline";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { OptimizerChangeCards } from "@/features/eaf/components/optimizer-change-cards";
import { RecommendationAcceptancePanel } from "@/features/eaf/components/recommendation-acceptance-panel";
import { RecommendationAlternativesPanel } from "@/features/eaf/components/recommendation-alternatives-panel";
import { RecommendationValidationTable } from "@/features/eaf/components/recommendation-validation-table";
import { SimilarHistoricalHeatCard } from "@/features/eaf/components/similar-historical-heat-card";
import { TrustMeterGauge, TttComparisonBars } from "@/features/eaf/components/prediction-visuals";
import { OptimizerDisclaimer } from "@/features/eaf/components/validation-banner";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafOptimize, useEafOptimizeV2, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import type { EafRecipe } from "@/lib/api/eaf";
import { formatVariableLabel } from "@/lib/eaf-labels";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

type OptimizerMode = "production" | "research" | "compare";

export default function EafOptimizerPage() {
  const searchParams = useSearchParams();
  const { recipe, update, charge } = useEafRecipe();
  const { optimize, loading: prodLoading, error: prodError, result: prodResult } = useEafOptimize();
  const { optimizeV2, loading: v2Loading, error: v2Error, result: v2Result } = useEafOptimizeV2();
  const active = useCurrentHeatStore((s) => s.active);
  const cachedHybrid = useCurrentHeatStore((s) => s.active?.hybrid);
  const [mode, setMode] = useState<OptimizerMode>("production");
  const hybridReliability = cachedHybrid?.reliability_index ?? null;
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const param = searchParams.get("mode");
    if (param === "research") setMode("research");
  }, [searchParams]);

  const explain = prodResult?.explainability;
  const v2Best = v2Result?.recommendations?.[0];
  const loading = prodLoading || v2Loading || compareLoading;
  const error = prodError || v2Error || compareError;

  const runOptimization = async () => {
    setCompareError(null);
    if (mode === "production") {
      await optimize(recipe);
      return;
    }
    if (mode === "research") {
      await optimizeV2(recipe);
      return;
    }
    setCompareLoading(true);
    try {
      await Promise.all([optimize(recipe), optimizeV2(recipe)]);
    } catch (e: unknown) {
      setCompareError(getApiErrorMessage(e, "Comparison run failed"));
    } finally {
      setCompareLoading(false);
    }
  };

  const showProd = mode === "production" || mode === "compare";
  const showV2 = mode === "research" || mode === "compare";

  return (
    <PageContainer title="Optimizer" description="Current heat burden composition loads automatically — no duplicate entry">
      {!active?.prediction ? <EmptyHeatState className="mb-6" /> : null}
      <HeatWorkflowStrip active={active} currentPage="optimize" className="mb-6" />
      <OptimizerDisclaimer className="mb-6" />
      {mode === "research" ? (
        <Badge className="mb-4 border-amber-500/40 bg-amber-500/10 text-amber-700">Research Tool — Phase 31 V2</Badge>
      ) : null}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["production", "research", "compare"] as const).map((m) => (
          <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
            {m === "production" ? "Production (20.2)" : m === "research" ? "Research (V2)" : "Compare Both"}
          </Button>
        ))}
      </div>
      <RecipeForm recipe={recipe} onChange={update} charge={charge} />
      <Button className="mt-6" onClick={runOptimization} disabled={loading || !active?.prediction}>
        {loading ? "Running…" : "Run Optimizer"}
      </Button>
      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {mode === "compare" && prodResult && v2Result ? (
        <SectionCard title="Optimizer comparison" className="mt-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Current TTT</p>
              <p className="font-mono text-2xl">{prodResult.current_ttt.toFixed(2)} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phase 20.2</p>
              <p className="font-mono text-2xl text-primary">{prodResult.optimized_ttt.toFixed(2)} min</p>
              <p className="text-sm text-green-600">−{prodResult.improvement_min.toFixed(2)} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Phase 31 V2</p>
              <p className="font-mono text-2xl text-primary">{v2Result.optimized_ttt.toFixed(2)} min</p>
              <p className="text-sm text-green-600">−{v2Result.improvement_min.toFixed(2)} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reliability Index</p>
              <p className="font-mono text-2xl">{hybridReliability != null ? hybridReliability.toFixed(1) : "—"}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Badge variant="outline">20.2 physics: {prodResult.physics_compliant ? "YES" : "NO"}</Badge>
            <Badge variant="outline">V2 physics: {v2Result.physics_compliant ? "YES" : "NO"}</Badge>
            <Badge variant="outline">V2 never optimizes Electrical Energy</Badge>
            <Badge variant="secondary">Confidence: {explain?.recommendation_confidence ?? v2Best?.confidence ?? "—"}</Badge>
          </div>
        </SectionCard>
      ) : null}

      {showProd && prodResult ? (
        <div className="mt-8 space-y-6">
          {mode !== "compare" ? <h2 className="text-lg font-semibold">Production — Phase 20.2</h2> : null}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TttComparisonBars
                historicalActual={
                  explain?.similar_heats?.length
                    ? [...explain.similar_heats].sort((a, b) => b.similarity_pct - a.similarity_pct)[0]?.actual_ttt
                    : null
                }
                predicted={prodResult.current_ttt}
                optimized={prodResult.optimized_ttt}
              />
            </div>
            <TrustMeterGauge value={hybridReliability} />
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <SectionCard title="Current">
              <p className="font-mono text-3xl">{prodResult.current_ttt.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Optimized">
              <p className="font-mono text-3xl text-primary">{prodResult.optimized_ttt.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Expected Saving">
              <p className="font-mono text-3xl text-green-600">{prodResult.improvement_min.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Recommendation Confidence">
              <p className="text-2xl font-semibold">{explain?.recommendation_confidence ?? "—"}</p>
            </SectionCard>
            <SectionCard title="Burden Stability">
              <p className="text-2xl font-semibold">{explain?.recommendation_stability ?? "—"}</p>
            </SectionCard>
          </div>
          {mode === "production" ? (
            <>
              <OptimizerChangeCards
                rows={explain?.validated_recommendations ?? prodResult.comparison}
                physicsCompliant={prodResult.physics_compliant}
              />
              <RecommendationAcceptancePanel />
              <FullRecommendationExplanation explanation={explain?.recommendation_narrative ? { narrative_lines: explain.recommendation_narrative } : undefined} />
              <RecommendationValidationTable rows={explain?.validated_recommendations ?? prodResult.comparison} />
              <RecommendationAlternativesPanel alternatives={explain?.top5_alternatives ?? []} />
              <SimilarHistoricalHeatCard
                heats={explain?.similar_heats ?? []}
                predictedTtt={prodResult.current_ttt}
                currentRecipe={recipe}
                optimizer={prodResult}
              />
              <DigitalTwinReadinessCard readiness={explain?.digital_twin_readiness} />
              {active ? <HeatLifecycleTimeline active={active} /> : null}
            </>
          ) : null}
        </div>
      ) : null}

      {showV2 && v2Result ? (
        <div className="mt-8 space-y-6">
          {mode !== "compare" ? <h2 className="text-lg font-semibold">Research — Phase 31 V2</h2> : null}
          <FullRecommendationExplanation
            explanation={v2Best?.explanation}
            reliabilityIndex={hybridReliability ?? undefined}
          />
          <RecommendationAlternativesPanel alternatives={v2Result.recommendations} />
          {mode === "research" ? (
            <OptimizerChangeCards
              rows={buildV2Comparison(v2Result.current_recipe, v2Result.optimized_recipe)}
              physicsCompliant={v2Result.physics_compliant}
              title="V2 Recommended Burden Changes"
            />
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}

function buildV2Comparison(current: EafRecipe, optimized: EafRecipe) {
  const vars = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY"] as const;
  return vars
    .filter((v) => Math.abs((optimized[v] ?? 0) - (current[v] ?? 0)) > 0.01)
    .map((v) => ({
      variable: v,
      display_name: formatVariableLabel(v),
      current: current[v] ?? 0,
      optimized: optimized[v] ?? 0,
      difference: (optimized[v] ?? 0) - (current[v] ?? 0),
      pct_change: current[v] ? (((optimized[v] ?? 0) - current[v]) / current[v]) * 100 : 0,
      arrow: "",
      reason: "Phase 31 V2 planning adjustment",
      physics_status: "feasible",
    }));
}
