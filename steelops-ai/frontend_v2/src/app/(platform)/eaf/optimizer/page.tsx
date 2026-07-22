"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { KpiStrip } from "@/components/layout/kpi-strip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import {
  OperatorContextBar,
  OperatorHeroMetric,
  OperatorWorkSurface,
} from "@/features/eaf/components/operator-work-surface";
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
import { PAGE_EXPLAINERS } from "@/lib/eaf-glossary";
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
    <PageContainer
      density="operator"
      eyebrow="Step 2 of 4 · Operator flow"
      title="Optimize the charge"
      description="Get a safer mix suggestion, then Accept / Modify / Reject before recording the real result."
      actions={
        isResearchUi ? (
          <div className="flex flex-wrap gap-2">
            {(["production", "research", "compare"] as const).map((m) => (
              <Button key={m} variant={effectiveMode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
                {m === "production" ? "Production" : m === "research" ? "Lab / research" : "Compare"}
              </Button>
            ))}
          </div>
        ) : undefined
      }
    >
      <OperatorWorkSurface>
        {!active?.prediction ? <EmptyHeatState /> : null}
        <HeatWorkflowStrip active={active} currentPage="optimize" />
        <PageExplainer {...PAGE_EXPLAINERS.optimizer} />
        <OptimizerDisclaimer />

        <OperatorContextBar
          items={[
            { label: "Heat", value: active?.heatNumber || "—" },
            { label: "Shift", value: recipe.Shift },
            { label: "Charge", value: `${charge.toFixed(1)} t` },
            {
              label: "Predicted",
              value: `${active?.prediction?.predicted_ttt.toFixed(1) ?? "—"} min`,
            },
          ]}
          actions={
            <Button onClick={runOptimization} disabled={loading || !active?.prediction} size="lg">
              {loading ? "Finding a better mix…" : "Suggest a better mix"}
            </Button>
          }
        />
        {error ? <PageAlert tone="error">{error}</PageAlert> : null}

        {effectiveMode === "compare" && prodResult && v2Result ? (
          <SectionCard tone="quiet" title="Optimizer comparison">
            <KpiStrip
              columns={3}
              items={[
                { label: "Current", value: `${prodResult.current_ttt.toFixed(2)} min` },
                { label: "Production suggestion", value: `${prodResult.optimized_ttt.toFixed(2)} min`, highlight: true },
                { label: "Research V2", value: `${v2Result.optimized_ttt.toFixed(2)} min` },
              ]}
            />
          </SectionCard>
        ) : null}

        {effectiveMode !== "research" && prodResult ? (
          <div className="space-y-4">
            <OperatorHeroMetric
              accent="primary"
              eyebrow="Suggested cycle time"
              value={prodResult.optimized_ttt.toFixed(1)}
              unit="min"
              hint={
                <>
                  Current estimate{" "}
                  <span className="font-mono text-foreground">{prodResult.current_ttt.toFixed(1)} min</span>
                  {" · "}
                  Possible save{" "}
                  <span className="font-mono font-semibold text-success">
                    {prodResult.improvement_min.toFixed(1)} min
                  </span>
                  {" · "}
                  advice only — never auto-control
                </>
              }
              side={
                <Badge variant="outline" className="border-success/40 bg-success/10">
                  {prodResult.physics_compliant ? "Physics OK" : "Check physics"}
                </Badge>
              }
            />

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
              className="rounded-lg border border-border/60 bg-muted/10 p-3"
              open={showDetails}
              onToggle={(e) => setShowDetails((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer text-sm font-medium">Engineering details (optional)</summary>
              <div className="mt-4 space-y-4">
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
          <div className="space-y-4">
            <Badge className="border-warning/40 bg-warning/10 text-foreground">Lab / research mode</Badge>
            <FullRecommendationExplanation explanation={v2Best?.explanation} />
            <RecommendationAlternativesPanel alternatives={v2Result.recommendations} />
            <OptimizerChangeCards
              rows={buildV2Comparison(v2Result.current_recipe, v2Result.optimized_recipe)}
              physicsCompliant={v2Result.physics_compliant}
              title="Recommended burden changes"
            />
          </div>
        ) : null}
      </OperatorWorkSurface>
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
