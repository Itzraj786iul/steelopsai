"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { ActionButton } from "@/components/data-display/action-button";
import { ErrorState } from "@/components/feedback/error-state";
import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { PreheatAnalysisView } from "@/features/preheat/components/preheat-analysis-view";
import { heatsApi } from "@/lib/api/heats";
import { queryKeys } from "@/lib/query-keys";
import { heatToIntelligenceRequest } from "@/features/preheat/utils/preheat-utils";

function PreheatPageContent() {
  const searchParams = useSearchParams();
  const heatId = searchParams.get("heatId");

  const heatQuery = useQuery({
    queryKey: queryKeys.heats.detail(heatId ?? "none"),
    queryFn: async () => (await heatsApi.get(heatId!)).data,
    enabled: !!heatId,
  });

  const request = useMemo(() => {
    if (!heatQuery.data) return undefined;
    return heatToIntelligenceRequest(heatQuery.data.recipe_json, {
      shift: heatQuery.data.shift,
      heatId: heatQuery.data.id,
      plannedStart: heatQuery.data.started_at,
    });
  }, [heatQuery.data]);

  if (heatId && heatQuery.isLoading) {
    return <PageLoadingSkeleton />;
  }

  if (heatId && heatQuery.isError) {
    return (
      <DashboardLayout>
        <ErrorState message="Unable to load heat for analysis." onRetry={() => heatQuery.refetch()} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Pre-Heat Intelligence"
        description="Unified orchestrator analysis for today's heat. One assistant, one decision."
        actions={
          <>
            <ActionButton variant="outline" asChild>
              <Link href="/decision-package">Decision package</Link>
            </ActionButton>
            <ActionButton variant="outline" asChild>
              <Link href="/recipes/compare">Compare recipes</Link>
            </ActionButton>
          </>
        }
      />
      {!heatId ? (
        <div className="space-y-4">
          <ErrorState message="Select a heat from Today Command Center to run pre-heat analysis." />
          <div className="flex justify-center">
            <ActionButton asChild>
              <Link href="/dashboard">Open dashboard</Link>
            </ActionButton>
          </div>
        </div>
      ) : null}
      {heatId ? <PreheatAnalysisView request={request} /> : null}
    </DashboardLayout>
  );
}

export function PreheatPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton />}>
      <PreheatPageContent />
    </Suspense>
  );
}
