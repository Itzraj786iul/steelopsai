"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { ExecutionTimeline, PlantStatusGrid } from "@/components/industrial";
import { VizPanel } from "@/components/industrial/primitives";
import { ActionButton } from "@/components/data-display/action-button";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { DashboardLayout } from "@/components/layout/page-header";
import { PriorityQueue } from "@/features/mission/components/priority-queue";
import { buildMissionHeats, buildMissionBriefing, buildMissionStats } from "@/features/mission/utils/mission-utils";
import { agentsApi } from "@/lib/api/agents";
import { heatsApi } from "@/lib/api/heats";
import { plantApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";
import { usePlantContext } from "@/hooks/use-plant-context";
import { usePreheatStore } from "@/stores/preheat-store";
import type { DashboardHeatRow } from "@/types/preheat.types";

function buildRows(
  schedule: Awaited<ReturnType<typeof plantApi.scheduling>>["data"],
  heats: Awaited<ReturnType<typeof heatsApi.list>>["data"]
): DashboardHeatRow[] {
  const heatMap = new Map(heats.items.map((h) => [h.heat_number, h]));
  return schedule.schedule.map((item, index) => ({
    id: heatMap.get(item.heat_number ?? "")?.id ?? item.id,
    heatNumber: item.heat_number ?? `SCH-${item.sequence_order}`,
    shift: item.shift,
    operator: item.operator_name ?? "Unassigned",
    status: item.status,
    priority: index === 0 ? "HIGH" : index < 3 ? "MEDIUM" : "LOW",
    plannedStart: item.planned_start,
    predictedAt: null,
    minutesToSave: null,
    aiReadiness: heatMap.get(item.heat_number ?? "")?.status === "PLANNED" ? "READY" : "PENDING",
    grade: "EAF-Carbon-Standard",
    recipe: {},
  }));
}

export function MissionControlView() {
  const { shift } = usePlantContext();
  const activePackage = usePreheatStore((s) => s.activePackage);

  const scheduleQuery = useQuery({
    queryKey: queryKeys.dashboard.today(shift),
    queryFn: async () => (await plantApi.scheduling(shift)).data,
  });
  const heatsQuery = useQuery({
    queryKey: queryKeys.heats.list({ page: 1, status: "PLANNED" }),
    queryFn: async () => (await heatsApi.list(1, 50, "PLANNED")).data,
  });
  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => (await agentsApi.approvals("PENDING")).data,
  });

  const { missions, briefing, stats } = useMemo(() => {
    if (!scheduleQuery.data || !heatsQuery.data) {
      return { missions: [], briefing: null, stats: null };
    }
    const rows = buildRows(scheduleQuery.data, heatsQuery.data);
    const stats = buildMissionStats(rows, activePackage, approvalsQuery.data?.length ?? 0);
    return {
      missions: buildMissionHeats(rows, activePackage),
      briefing: buildMissionBriefing(stats, rows),
      stats,
    };
  }, [scheduleQuery.data, heatsQuery.data, activePackage, approvalsQuery.data]);

  if (scheduleQuery.isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label">Mission control</p>
          <h1 className="text-display-md">Plant operations</h1>
          <p className="mt-2 text-muted-foreground">{briefing?.objective}</p>
        </div>
        <ActionButton asChild>
          <Link href="/live">Live floor</Link>
        </ActionButton>
      </header>

      <VizPanel title="Shift timeline" className="mb-6">
        <ExecutionTimeline activeStep={3} />
      </VizPanel>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <VizPanel title="Plant status" className="lg:col-span-1">
          <PlantStatusGrid
            cells={[
              { label: "EAF #1", status: "ok" },
              { label: "EAF #2", status: "warn" },
              { label: "LF", status: "ok" },
              { label: "Caster", status: "ok" },
              { label: "Approvals", status: (stats?.pendingApprovals ?? 0) > 0 ? "critical" : "ok" },
              { label: "AI engine", status: "ok" },
            ]}
          />
        </VizPanel>
        <VizPanel title="AI summary" className="lg:col-span-2">
          <ul className="space-y-2 text-sm">
            {briefing?.opportunities.map((o) => (
              <li key={o} className="text-accent">· {o}</li>
            ))}
            {briefing?.risks.map((r) => (
              <li key={r} className="text-warning">· {r}</li>
            ))}
          </ul>
        </VizPanel>
      </div>

      <VizPanel title="Priority queue" description="AI-ranked heats — highest value first">
        <PriorityQueue missions={missions} />
      </VizPanel>
    </DashboardLayout>
  );
}
