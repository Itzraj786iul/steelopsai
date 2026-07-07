"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { ErrorState } from "@/components/feedback/error-state";
import { ApprovalPanel } from "@/features/preheat/components/approval-panel";
import { DigitalTwinSummary } from "@/features/preheat/components/digital-twin-summary";
import { EngineeringReasoning, HistoricalEvidence } from "@/features/preheat/components/reasoning-card";
import { RecommendationTable } from "@/features/preheat/components/recipe-card";
import { PredictionCard } from "@/features/preheat/components/prediction-card";
import { agentsApi } from "@/lib/api/agents";
import { queryKeys } from "@/lib/query-keys";
import { usePreheatStore } from "@/stores/preheat-store";
import { SectionCard } from "@/components/layout/section-card";
import { formatDateTime } from "@/lib/date-utils";

export function ApprovalDetailView({ approvalId }: { approvalId: string }) {
  const pkg = usePreheatStore((state) => state.activePackage);

  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => (await agentsApi.approvals("PENDING")).data,
  });

  const approval = useMemo(
    () => approvalsQuery.data?.find((item) => item.id === approvalId),
    [approvalsQuery.data, approvalId]
  );

  if (approvalsQuery.isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (!approval) {
    return (
      <DashboardLayout>
        <ErrorState message="Approval not found or already decided." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Operator approval" description={approval.recommendation ?? "Review orchestrator recommendation"} />
      <div className="space-y-6">
        <SectionCard title="Recommendation">
          <p className="text-sm">{approval.recommendation}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Confidence {((approval.confidence ?? 0) * 100).toFixed(1)}%
          </p>
        </SectionCard>

        {pkg ? (
          <>
            <PredictionCard
              predictedAt={pkg.predicted_heat_time_min}
              targetAt={pkg.target_heat_time_min}
              minutesToSave={pkg.minutes_to_save}
              confidenceTier={pkg.confidence_tier}
              confidenceScore={pkg.confidence_score}
              greenPct={pkg.expected_GREEN_probability_pct}
            />
            <RecommendationTable current={pkg.planned_recipe} recommended={pkg.recommended_optimized_recipe} />
            <EngineeringReasoning reasoning={pkg.engineering_reasoning} rootCause={pkg.root_cause} />
            <HistoricalEvidence references={pkg.learning_references} />
            <DigitalTwinSummary comparison={pkg.digital_twin_comparison} />
          </>
        ) : (
          <SectionCard title="Evidence">
            <p className="text-sm text-muted-foreground">
              Run pre-heat analysis to attach full orchestrator evidence to this approval.
            </p>
          </SectionCard>
        )}

        <SectionCard title="Audit timeline">
          <div className="space-y-2 text-sm">
            <AuditRow label="Approval created" value={formatDateTime(new Date().toISOString())} />
            <AuditRow label="Status" value={approval.status} />
            <AuditRow label="Agent" value={approval.agent_id ?? "—"} />
          </div>
        </SectionCard>

        {pkg ? <ApprovalPanel packageData={pkg} approvalId={approvalId} /> : null}
      </div>
    </DashboardLayout>
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
