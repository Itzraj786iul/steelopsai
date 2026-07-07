"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { StatusBadge } from "@/components/data-display/status-badge";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { DashboardLayout } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";
import { Input } from "@/components/ui/input";
import { AIBriefing } from "@/features/mission/components/ai-briefing";
import { MissionCardGrid } from "@/features/mission/components/mission-card";
import { MissionHero } from "@/features/mission/components/mission-hero";
import { PriorityQueue } from "@/features/mission/components/priority-queue";
import {
  buildMissionBriefing,
  buildMissionHeats,
  buildMissionStats,
} from "@/features/mission/utils/mission-utils";
import { heatsApi } from "@/lib/api/heats";
import { agentsApi } from "@/lib/api/agents";
import { plantApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/use-auth";
import { usePlantContext } from "@/hooks/use-plant-context";
import { usePreheatStore } from "@/stores/preheat-store";
import { detailLevel, useDecisionModeStore } from "@/stores/decision-mode-store";
import type { DashboardHeatRow } from "@/types/preheat.types";
import { CalendarOff, Flame } from "lucide-react";

function buildDashboardRows(
  schedule: Awaited<ReturnType<typeof plantApi.scheduling>>["data"],
  heats: Awaited<ReturnType<typeof heatsApi.list>>["data"]
): DashboardHeatRow[] {
  const heatMap = new Map(heats.items.map((heat) => [heat.heat_number, heat]));
  return schedule.schedule.map((item, index) => {
    const heat = item.heat_number ? heatMap.get(item.heat_number) : undefined;
    const recipe = (heat?.recipe_json ?? {}) as Record<string, unknown>;
    return {
      id: heat?.id ?? item.id,
      heatNumber: item.heat_number ?? `SCH-${item.sequence_order}`,
      shift: item.shift,
      operator: item.operator_name ?? "Unassigned",
      status: item.status,
      priority: index === 0 ? "HIGH" : index < 3 ? "MEDIUM" : "LOW",
      plannedStart: item.planned_start,
      predictedAt: null,
      minutesToSave: null,
      aiReadiness: heat?.status === "PLANNED" ? "READY" : "PENDING",
      grade: String(recipe.Grade ?? "EAF-Carbon-Standard"),
      recipe,
    };
  });
}

export function TodayDashboard() {
  const { user } = useAuth();
  const { shift } = usePlantContext();
  const { mode } = useDecisionModeStore();
  const level = detailLevel(mode);
  const activePackage = usePreheatStore((state) => state.activePackage);
  const [search, setSearch] = useState("");
  const [showSchedule, setShowSchedule] = useState(level !== "minimal");

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

  const rows = useMemo(() => {
    if (!scheduleQuery.data || !heatsQuery.data) return [];
    return buildDashboardRows(scheduleQuery.data, heatsQuery.data);
  }, [scheduleQuery.data, heatsQuery.data]);

  const missions = useMemo(() => buildMissionHeats(rows, activePackage), [rows, activePackage]);
  const stats = useMemo(
    () => buildMissionStats(rows, activePackage, approvalsQuery.data?.length ?? 0),
    [rows, activePackage, approvalsQuery.data]
  );
  const briefing = useMemo(() => buildMissionBriefing(stats, rows), [stats, rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      `${row.heatNumber} ${row.operator}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [rows, search]);

  if (scheduleQuery.isLoading || heatsQuery.isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (scheduleQuery.isError || heatsQuery.isError) {
    return (
      <DashboardLayout>
        <ErrorState variant="api" message="Unable to load today's mission." onRetry={() => scheduleQuery.refetch()} />
      </DashboardLayout>
    );
  }

  const firstHeatId = missions[0]?.id;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <MissionHero userName={user?.full_name} stats={stats} firstHeatId={firstHeatId} />
        <AIBriefing briefing={briefing} />

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-label">Your mission queue</p>
              <h2 className="text-heading-lg">What to do next</h2>
            </div>
            <ActionButton variant="outline" asChild>
              <Link href="/copilot">Open full mission workspace</Link>
            </ActionButton>
          </div>
          {missions.length > 0 ? (
            <MissionCardGrid missions={missions.slice(0, 6)} />
          ) : (
            <EmptyState title="No missions today" description="When heats are scheduled they will appear here as AI-ranked missions." />
          )}
        </section>

        {level !== "minimal" ? (
          <SectionCard title="AI priority queue">
            <PriorityQueue missions={missions} />
          </SectionCard>
        ) : null}

        {(level === "full" || level === "executive") && (
          <div>
            <button
              type="button"
              className="mb-3 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowSchedule(!showSchedule)}
            >
              {showSchedule ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showSchedule ? "Hide" : "Show"} full schedule
            </button>
            {showSchedule ? (
              <SectionCard
                title="Schedule details"
                actions={
                  <div className="relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                }
              >
                <div className="overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full min-w-[800px] text-sm">
                    <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Heat</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Operator</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-4 py-3 font-medium">{row.heatNumber}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3">{row.operator}</td>
                          <td className="px-4 py-3">
                            <ActionButton size="sm" asChild>
                              <Link href={`/copilot?heatId=${row.id}`}>Start</Link>
                            </ActionButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredRows.length === 0 ? (
                  <EmptyState
                    icon={rows.length === 0 ? CalendarOff : Flame}
                    title="No heats match"
                    className="mt-4 border-none bg-transparent"
                  />
                ) : null}
              </SectionCard>
            ) : null}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
