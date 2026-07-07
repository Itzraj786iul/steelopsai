"use client";

import { useMemo } from "react";

import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { ComparisonBarChart, ComparisonRadarChart, TimelineComparisonChart } from "@/features/preheat/components/comparison-chart";
import { usePreheatStore } from "@/stores/preheat-store";
import { useQuery } from "@tanstack/react-query";
import { optimizationApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";
import { formatCurrency } from "@/lib/utils";

export function RecipeComparePage() {
  const pkg = usePreheatStore((state) => state.activePackage);

  const compareQuery = useQuery({
    queryKey: queryKeys.recipes.compare(["Current", "Optimized"]),
    enabled: !!pkg,
    queryFn: async () => {
      if (!pkg) throw new Error("Missing package");
      const current = {
        HM: Number(pkg.planned_recipe.HM),
        DRI: Number(pkg.planned_recipe.DRI),
        CPC: Number(pkg.planned_recipe.CPC),
        LIME: Number(pkg.planned_recipe.LIME),
        DOLO: Number(pkg.planned_recipe.DOLO),
        Bucket: Number(pkg.planned_recipe.Bucket ?? 12),
        Shift: pkg.shift,
        "T C": Number(pkg.planned_recipe["T C"] ?? 120),
      };
      const optimized = {
        HM: Number(pkg.recommended_optimized_recipe.HM),
        DRI: Number(pkg.recommended_optimized_recipe.DRI),
        CPC: Number(pkg.recommended_optimized_recipe.CPC),
        LIME: Number(pkg.recommended_optimized_recipe.LIME),
        DOLO: Number(pkg.recommended_optimized_recipe.DOLO),
        Bucket: Number(pkg.planned_recipe.Bucket ?? 12),
        Shift: pkg.shift,
        "T C": Number(pkg.recommended_optimized_recipe["T C"] ?? 120),
      };
      return (await optimizationApi.compareRecipes([current, optimized], ["Current", "Optimized"])).data;
    },
  });

  const chartData = useMemo(() => {
    if (!pkg) return [];
    return [
      { metric: "HM", current: Number(pkg.planned_recipe.HM), optimized: Number(pkg.recommended_optimized_recipe.HM) },
      { metric: "DRI", current: Number(pkg.planned_recipe.DRI), optimized: Number(pkg.recommended_optimized_recipe.DRI) },
      { metric: "CPC", current: Number(pkg.planned_recipe.CPC), optimized: Number(pkg.recommended_optimized_recipe.CPC) },
      {
        metric: "AT",
        current: pkg.predicted_heat_time_min,
        optimized: pkg.target_heat_time_min,
      },
      {
        metric: "GREEN",
        current: pkg.digital_twin_comparison.baseline_GREEN_pct ?? pkg.expected_GREEN_probability_pct,
        optimized: pkg.digital_twin_comparison.optimized_GREEN_pct ?? pkg.expected_GREEN_probability_pct,
      },
      {
        metric: "Power",
        current: (pkg.digital_twin_comparison.baseline_POWER_kWh ?? pkg.expected_POWER) / 1000,
        optimized: (pkg.digital_twin_comparison.optimized_POWER_kWh ?? pkg.expected_POWER) / 1000,
      },
    ];
  }, [pkg]);

  if (!pkg) {
    return (
      <DashboardLayout>
        <ErrorState message="Run pre-heat analysis first to compare recipes." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Recipe comparison"
        description="Side-by-side view of current vs optimized recipe performance."
      />
      {compareQuery.isLoading ? <PageLoadingSkeleton /> : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <ComparisonBarChart data={chartData} />
        <ComparisonRadarChart data={chartData} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <TimelineComparisonChart
          baseline={pkg.digital_twin_comparison.baseline_heat_time_min ?? pkg.predicted_heat_time_min}
          optimized={pkg.digital_twin_comparison.optimized_heat_time_min ?? pkg.target_heat_time_min}
        />
        <div className="rounded-lg border border-border/80 bg-card p-6">
          <p className="text-label">Expected savings</p>
          <p className="mt-2 text-3xl font-semibold text-accent">{formatCurrency(pkg.business_value_inr)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {compareQuery.data?.best_by_savings
              ? `Best savings candidate: ${compareQuery.data.best_by_savings.label ?? "Optimized"}`
              : "Optimized recipe selected by orchestrator"}
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
