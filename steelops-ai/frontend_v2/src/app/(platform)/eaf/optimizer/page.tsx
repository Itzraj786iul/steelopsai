"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { OptimizerChangeCards } from "@/features/eaf/components/optimizer-change-cards";
import { RecommendationAcceptancePanel } from "@/features/eaf/components/recommendation-acceptance-panel";
import { RecommendationAlternativesPanel } from "@/features/eaf/components/recommendation-alternatives-panel";
import { RecommendationValidationTable } from "@/features/eaf/components/recommendation-validation-table";
import { SimilarHistoricalHeatCard } from "@/features/eaf/components/similar-historical-heat-card";
import { TttComparisonBars } from "@/features/eaf/components/prediction-visuals";
import { OptimizerDisclaimer } from "@/features/eaf/components/validation-banner";
import { FullRecommendationExplanation } from "@/features/eaf/components/full-recommendation-explanation";
import { usePermissions } from "@/hooks/use-auth";
import { useEafOptimize, useEafOptimizeV2, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import type { EafRecipe } from "@/lib/api/eaf";
import { formatVariableLabel } from "@/lib/eaf-labels";
import { getApiErrorMessage } from "@/services/api-client";
import { currentCharge, useCurrentHeatStore } from "@/stores/current-heat-store";

type OptimizerMode = "production" | "research" | "compare";

export default function EafOptimizerPage() {
  const searchParams = useSearchParams();
  const { canAccessLabs } = usePermissions();
  const allowResearch = canAccessLabs();
  const { recipe } = useEafRecipe();
  const { optimize, loading: prodLoading, error: prodError, result: prodResult } = useEafOptimize();
  const { optimizeV2, loading: v2Loading, error: v2Error, result: v2Result } = useEafOptimizeV2();
  const active = useCurrentHeatStore((s) => s.active);
  const [mode, setMode] = useState<OptimizerMode>("production");
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (!allowResearch) {
      setMode("production");
      return;
    }
    const param = searchParams.get("mode");
    if (param === "research" || param === "compare") setMode(param);
  }, [allowResearch, searchParams]);

  const explain = prodResult?.explainability;
  const v2Best = v2Result?.recommendations?.[0];
  const loading = prodLoading || v2Loading || compareLoading;
  const error = prodError || v2Error || compareError;
  const charge = currentCharge(recipe);
  const effectiveMode: OptimizerMode = allowResearch ? mode : "production";
  const isResearchUi = allowResearch && (effectiveMode === "research" || effectiveMode === "compare");

  const runOptimization = async () => {
    setCompareError(null);
    if (effectiveMode === "production") {
      await optimize(recipe);
      return;
    }
    if (effectiveMode === "research") {
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

  return (
    <PageContainer title="Optimizer" description="Run recommendation → Accept / Modify / Reject → Validation">
      {!active?.prediction ? <EmptyHeatState className="mb-6" /> : null}
      <HeatWorkflowStrip active={active} currentPage="optimize" className="mb-6" />
      <OptimizerDisclaimer className="mb-4" />

      {isResearchUi ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {(["production", "research", "compare"] as const).map((m) => (
            <Button key={m} variant={effectiveMode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
              {m === "production" ? "Production" : m === "research" ? "Research V2" : "Compare"}
            </Button>
          ))}
        </div>
      ) : null}

      <SectionCard title="Current heat" description="Loaded from prediction — no re-entry needed">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="outline">Heat {active?.heatNumber || "—"}</Badge>
          <Badge variant="outline">Shift {recipe.Shift}</Badge>
          <span className="font-mono text-muted-foreground">Charge {charge.toFixed(1)} t</span>
          <span className="font-mono text-muted-foreground">
            Pred {active?.prediction?.predicted_ttt.toFixed(1) ?? "—"} min
          </span>
        </div>
        <Button className="mt-4" onClick={runOptimization} disabled={loading || !active?.prediction}>
          {loading ? "Running…" : "Run Optimizer"}
        </Button>
        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </SectionCard>

      {effectiveMode === "compare" && prodResult && v2Result ? (
        <SectionCard title="Optimizer comparison" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Current</p>
              <p className="font-mono text-2xl">{prodResult.current_ttt.toFixed(2)} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Production</p>
              <p className="font-mono text-2xl text-primary">{prodResult.optimized_ttt.toFixed(2)} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Research V2</p>
              <p className="font-mono text-2xl text-primary">{v2Result.optimized_ttt.toFixed(2)} min</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {effectiveMode !== "research" && prodResult ? (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SectionCard title="Current">
              <p className="font-mono text-2xl">{prodResult.current_ttt.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Optimized">
              <p className="font-mono text-2xl text-primary">{prodResult.optimized_ttt.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Expected saving">
              <p className="font-mono text-2xl text-green-600">{prodResult.improvement_min.toFixed(2)} min</p>
            </SectionCard>
          </div>

          <TttComparisonBars
            historicalActual={
              explain?.similar_heats?.length
                ? [...explain.similar_heats].sort(
                    (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.similarity_pct - a.similarity_pct
                  )[0]?.actual_ttt
                : null
            }
            predicted={prodResult.current_ttt}
            optimized={prodResult.optimized_ttt}
          />

          <OptimizerChangeCards
            rows={explain?.validated_recommendations ?? prodResult.comparison}
            physicsCompliant={prodResult.physics_compliant}
          />

          <RecommendationAcceptancePanel />

          <details
            className="rounded-lg border border-border/60 bg-muted/10 p-4"
            open={showDetails}
            onToggle={(e) => setShowDetails((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer text-sm font-medium">More details (optional)</summary>
            <div className="mt-4 space-y-6">
              <FullRecommendationExplanation
                explanation={
                  explain?.recommendation_narrative
                    ? { narrative_lines: explain.recommendation_narrative }
                    : undefined
                }
              />
              <RecommendationValidationTable rows={explain?.validated_recommendations ?? prodResult.comparison} />
              <RecommendationAlternativesPanel alternatives={explain?.top5_alternatives ?? []} />
              <SimilarHistoricalHeatCard
                heats={explain?.similar_heats ?? []}
                predictedTtt={prodResult.current_ttt}
                currentRecipe={recipe}
                optimizer={prodResult}
                neighborBenchmark={explain?.neighbor_benchmark}
                showExploreLink={allowResearch}
              />
            </div>
          </details>
        </div>
      ) : null}

      {effectiveMode === "research" && v2Result ? (
        <div className="mt-6 space-y-6">
          <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-700">Research optimizer</Badge>
          <FullRecommendationExplanation explanation={v2Best?.explanation} />
          <RecommendationAlternativesPanel alternatives={v2Result.recommendations} />
          <OptimizerChangeCards
            rows={buildV2Comparison(v2Result.current_recipe, v2Result.optimized_recipe)}
            physicsCompliant={v2Result.physics_compliant}
            title="Recommended burden changes"
          />
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
      reason: "Research planning adjustment",
      physics_status: "feasible",
    }));
}
