"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";

import { ActionButton } from "@/components/data-display/action-button";

import { ErrorState } from "@/components/feedback/error-state";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ApprovalPanel } from "@/features/preheat/components/approval-panel";
import { DecisionPackageViewer } from "@/features/preheat/components/decision-package-viewer";
import { DigitalTwinSummary } from "@/features/preheat/components/digital-twin-summary";
import { InterventionSummary } from "@/features/preheat/components/approval-panel";
import { OperatorActions } from "@/features/preheat/components/reasoning-card";
import { HistoricalEvidence } from "@/features/preheat/components/reasoning-card";
import { EngineeringReasoning } from "@/features/preheat/components/reasoning-card";
import { PortfolioGrid, RecommendationTable } from "@/features/preheat/components/recipe-card";
import { PredictionCard, SavingCard } from "@/features/preheat/components/prediction-card";
import { preheatApi } from "@/lib/api/preheat";
import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/services/api-client";
import { usePreheatStore } from "@/stores/preheat-store";
import { sortPortfolio } from "@/features/preheat/utils/preheat-utils";
import type { PreheatIntelligenceRequest, PreheatDecisionPackage } from "@/types/preheat.types";
import { ErrorBoundary } from "@/components/feedback/error-boundary";

export function usePreheatAnalysis() {
  const setActivePackage = usePreheatStore((state) => state.setActivePackage);

  return useMutation({
    mutationKey: queryKeys.preheat.intelligence(),
    mutationFn: async (payload: PreheatIntelligenceRequest) => {
      const response = await preheatApi.runIntelligence(payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      setActivePackage(data, variables.heat_id ?? null);
    },
  });
}

export function PreheatAnalysisView({
  initialPackage,
  request,
  showApproval = true,
}: {
  initialPackage?: PreheatDecisionPackage | null;
  request?: PreheatIntelligenceRequest;
  showApproval?: boolean;
}) {
  const stored = usePreheatStore((state) => state.activePackage);
  const { mutate, isPending, isSuccess, isError, data, error } = usePreheatAnalysis();

  const pkg = initialPackage ?? stored ?? data ?? null;

  useEffect(() => {
    if (!request || pkg || isPending || isSuccess || isError) return;
    mutate(request);
  }, [request, pkg, isPending, isSuccess, isError, mutate]);

  if (isPending && !pkg) {
    return <PageLoadingSkeleton />;
  }

  if (isError && !pkg) {
    return <ErrorState message={getApiErrorMessage(error)} onRetry={() => request && mutate(request)} />;
  }

  if (!pkg) {
    return <ErrorState message="No decision package available. Run analysis from Today or Heat Details." />;
  }

  const portfolio = sortPortfolio(pkg.alternative_recipes);

  return (
    <ErrorBoundary fallbackTitle="Pre-heat analysis error">
      <div className="space-y-6 animate-slide-up">
        <PredictionCard
          predictedAt={pkg.predicted_heat_time_min}
          targetAt={pkg.target_heat_time_min}
          minutesToSave={pkg.minutes_to_save}
          confidenceTier={pkg.confidence_tier}
          confidenceScore={pkg.confidence_score}
          greenPct={pkg.expected_GREEN_probability_pct}
        />
        <SavingCard minutes={pkg.minutes_to_save} valueInr={pkg.business_value_inr} />
        <RecommendationTable current={pkg.planned_recipe} recommended={pkg.recommended_optimized_recipe} />
        <InterventionSummary
          current={pkg.planned_recipe}
          recommended={pkg.recommended_optimized_recipe}
          explanation={pkg.engineering_reasoning}
        />
        <EngineeringReasoning reasoning={pkg.engineering_reasoning} rootCause={pkg.root_cause} />
        <HistoricalEvidence references={pkg.learning_references} />
        <DigitalTwinSummary comparison={pkg.digital_twin_comparison} />
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-heading-md">Alternative recipes</h3>
            <ActionButton variant="outline" size="sm" asChild>
              <Link href="/recipes">View portfolio</Link>
            </ActionButton>
          </div>
          <PortfolioGrid recipes={portfolio} />
        </section>
        <OperatorActions actions={pkg.operator_actions} />
        {showApproval ? <ApprovalPanel packageData={pkg} /> : null}
        {pkg.validation_errors.length ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {pkg.validation_errors.join(" · ")}
          </div>
        ) : null}
      </div>
    </ErrorBoundary>
  );
}

export function DecisionPackagePageView() {
  const pkg = usePreheatStore((state) => state.activePackage);
  if (!pkg) {
    return <ErrorState message="No active decision package. Run pre-heat analysis first." />;
  }
  return <DecisionPackageViewer packageData={pkg} />;
}
