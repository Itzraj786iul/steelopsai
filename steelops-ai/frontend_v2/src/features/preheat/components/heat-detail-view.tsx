"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";
import { ActionButton } from "@/components/data-display/action-button";
import { heatsApi } from "@/lib/api/heats";
import { agentsApi } from "@/lib/api/agents";
import { predictionApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";
import { recipeFingerprint } from "@/features/preheat/utils/preheat-utils";
import { usePreheatStore } from "@/stores/preheat-store";
import { formatDateTime } from "@/lib/date-utils";
import { formatDurationMinutes } from "@/lib/date-utils";

export function HeatDetailView({ heatId }: { heatId: string }) {
  const activePackage = usePreheatStore((state) => state.activePackage);
  const activeHeatId = usePreheatStore((state) => state.activeHeatId);

  const heatQuery = useQuery({
    queryKey: queryKeys.heats.detail(heatId),
    queryFn: async () => (await heatsApi.get(heatId)).data,
  });

  const historyQuery = useQuery({
    queryKey: queryKeys.prediction.history(20),
    queryFn: async () => (await predictionApi.history(20)).data,
  });

  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => (await agentsApi.approvals("PENDING")).data,
  });

  if (heatQuery.isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (heatQuery.isError || !heatQuery.data) {
    return (
      <DashboardLayout>
        <ErrorState message="Heat not found or unavailable." onRetry={() => heatQuery.refetch()} />
      </DashboardLayout>
    );
  }

  const heat = heatQuery.data;
  const recipe = heat.recipe_json as Record<string, unknown>;
  const pendingApproval = approvalsQuery.data?.[0];
  const prediction = activePackage && activeHeatId === heatId ? activePackage : null;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Heat ${heat.heat_number}`}
        description="Read-only heat record with prediction summary and approval state."
        actions={
          <ActionButton asChild>
            <Link href={`/preheat?heatId=${heat.id}`}>Analyze</Link>
          </ActionButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Planned recipe" className="xl:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(recipe).map(([key, value]) => (
              <div key={key} className="rounded-md bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">{key}</p>
                <p className="font-mono text-sm">{String(value)}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recipe fingerprint">
          <p className="text-sm">{recipeFingerprint(recipe as Record<string, number>)}</p>
          <p className="mt-3 text-sm text-muted-foreground">Grade {String(recipe.Grade ?? "EAF-Carbon-Standard")}</p>
          <p className="text-sm text-muted-foreground">Historical family C · Shift {heat.shift ?? "—"}</p>
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Prediction summary">
          {prediction ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <SummaryItem label="Predicted AT" value={formatDurationMinutes(prediction.predicted_heat_time_min)} />
              <SummaryItem label="Target AT" value={formatDurationMinutes(prediction.target_heat_time_min)} />
              <SummaryItem label="Potential saving" value={formatDurationMinutes(prediction.minutes_to_save)} />
              <SummaryItem label="Confidence" value={`${prediction.confidence_tier} (${prediction.confidence_score.toFixed(1)}%)`} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Run pre-heat analysis to populate prediction summary.</p>
          )}
        </SectionCard>

        <SectionCard title="Approval state">
          <StatusBadge status={pendingApproval ? "PENDING" : "APPROVED"} />
          {pendingApproval ? (
            <p className="mt-3 text-sm text-muted-foreground">{pendingApproval.recommendation}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No pending approval for this shift.</p>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Historical similar heats">
          <div className="space-y-2">
            {(historyQuery.data ?? []).slice(0, 5).map((item, index) => (
              <div key={index} className="rounded-md border border-border/80 px-3 py-2 text-sm">
                {String(item.heat_id ?? item.id ?? `Historical ${index + 1}`)}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Timeline">
          <div className="space-y-2 text-sm">
            <TimelineRow label="Created" value={formatDateTime(heat.created_at)} />
            <TimelineRow label="Started" value={formatDateTime(heat.started_at)} />
            <TimelineRow label="Updated" value={formatDateTime(heat.updated_at)} />
            <TimelineRow label="Status" value={heat.status} />
          </div>
        </SectionCard>
      </div>

      {prediction ? (
        <SectionCard title="Engineering notes" className="mt-6">
          <p className="text-sm leading-relaxed">{prediction.engineering_reasoning}</p>
        </SectionCard>
      ) : null}
    </DashboardLayout>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/80 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
