"use client";

import { useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrentHeatBanner } from "@/features/eaf/components/current-heat-banner";
import { DigitalTwinReadinessCard } from "@/features/eaf/components/digital-twin-readiness-card";
import { FullRecommendationExplanation } from "@/features/eaf/components/full-recommendation-explanation";
import { RecommendationAlternativesPanel } from "@/features/eaf/components/recommendation-alternatives-panel";
import { RecommendationValidationTable } from "@/features/eaf/components/recommendation-validation-table";
import { SimilarHeatsPanel } from "@/features/eaf/components/similar-heats-panel";
import { OptimizerDisclaimer } from "@/features/eaf/components/validation-banner";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafOptimize, useEafOptimizeV2, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { eafApi, type EafRecipe } from "@/lib/api/eaf";
import { formatVariableLabel } from "@/lib/eaf-labels";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

type OptimizerMode = "production" | "research" | "compare";

export default function EafOptimizerPage() {
  const { recipe, update, charge } = useEafRecipe();
  const { optimize, loading: prodLoading, error: prodError, result: prodResult } = useEafOptimize();
  const { optimizeV2, loading: v2Loading, error: v2Error, result: v2Result } = useEafOptimizeV2();
  const cachedHybrid = useCurrentHeatStore((s) => s.active?.hybrid);
  const [mode, setMode] = useState<OptimizerMode>("compare");
  const hybridReliability = cachedHybrid?.reliability_index ?? null;
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

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
    <PageContainer title="Recipe Optimizer" description="Current heat recipe loads automatically — no duplicate entry">
      <CurrentHeatBanner />
      <OptimizerDisclaimer className="mb-6" />
      <div className="mb-4 flex flex-wrap gap-2">
        {(["production", "research", "compare"] as const).map((m) => (
          <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
            {m === "production" ? "Production (20.2)" : m === "research" ? "Research (V2)" : "Compare Both"}
          </Button>
        ))}
      </div>
      <RecipeForm recipe={recipe} onChange={update} charge={charge} />
      <Button className="mt-6" onClick={runOptimization} disabled={loading}>
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
            <Badge variant="outline">V2 never optimizes POWER</Badge>
            <Badge variant="secondary">Confidence: {explain?.recommendation_confidence ?? v2Best?.confidence ?? "—"}</Badge>
          </div>
        </SectionCard>
      ) : null}

      {showProd && prodResult ? (
        <div className="mt-8 space-y-6">
          {mode !== "compare" ? <h2 className="text-lg font-semibold">Production — Phase 20.2</h2> : null}
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
            <SectionCard title="Recipe Stability">
              <p className="text-2xl font-semibold">{explain?.recommendation_stability ?? "—"}</p>
            </SectionCard>
          </div>
          {mode === "production" ? (
            <>
              <FullRecommendationExplanation explanation={explain?.recommendation_narrative ? { narrative_lines: explain.recommendation_narrative } : undefined} />
              <RecommendationValidationTable rows={explain?.validated_recommendations ?? prodResult.comparison} />
              <SectionCard title="Recipe Comparison">
                <ComparisonTable rows={prodResult.comparison} physicsCompliant={prodResult.physics_compliant} />
              </SectionCard>
              <RecommendationAlternativesPanel alternatives={explain?.top5_alternatives ?? []} />
              <SimilarHeatsPanel heats={explain?.similar_heats ?? []} />
              <DigitalTwinReadinessCard readiness={explain?.digital_twin_readiness} />
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
            <SectionCard title="Best recommendation recipe">
              <ComparisonTable
                rows={buildV2Comparison(v2Result.current_recipe, v2Result.optimized_recipe)}
                physicsCompliant={v2Result.physics_compliant}
              />
            </SectionCard>
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
      reason: "Phase 31 V2 planning adjustment",
      physics_status: "feasible",
    }));
}

function ComparisonTable({
  rows,
  physicsCompliant,
}: {
  rows: { variable: string; display_name?: string; current: number; optimized: number; difference: number; pct_change: number; reason: string; physics_status: string }[];
  physicsCompliant: boolean;
}) {
  return (
  <>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Variable</th>
            <th>Current</th>
            <th>Optimized</th>
            <th>Diff</th>
            <th>%</th>
            <th>Reason</th>
            <th>Physics</th>
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => (
            <tr key={row.variable} className="border-b border-border/50 align-top">
              <td className="py-2 font-medium">{row.display_name ?? formatVariableLabel(row.variable)}</td>
              <td className="font-mono">{row.current.toFixed(2)}</td>
              <td className="font-mono">{row.optimized.toFixed(2)}</td>
              <td className="font-mono">
                {row.difference >= 0 ? "+" : ""}
                {row.difference.toFixed(2)}
              </td>
              <td className="font-mono">{row.pct_change.toFixed(1)}%</td>
              <td className="max-w-xs text-xs text-muted-foreground">{row.reason}</td>
              <td>
                <Badge variant="outline">{row.physics_status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="mt-4 text-sm text-muted-foreground">
      Physics compliant: <strong>{physicsCompliant ? "YES" : "NO"}</strong>
    </p>
  </>
  );
}
