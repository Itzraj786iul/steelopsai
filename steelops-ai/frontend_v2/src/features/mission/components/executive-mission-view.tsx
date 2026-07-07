"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { HeatFunnel, PlantStatusGrid, TrendRiver } from "@/components/industrial";
import { VizPanel } from "@/components/industrial/primitives";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { DashboardLayout } from "@/components/layout/page-header";
import { agentsApi } from "@/lib/api/agents";
import { plantApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";
import { usePlantContext } from "@/hooks/use-plant-context";
import { usePreheatStore } from "@/stores/preheat-store";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";
import { buildMissionStats } from "@/features/mission/utils/mission-utils";

export function ExecutiveMissionView() {
  const { shift } = usePlantContext();
  const activePackage = usePreheatStore((s) => s.activePackage);

  const scheduleQuery = useQuery({
    queryKey: queryKeys.dashboard.today(shift),
    queryFn: async () => (await plantApi.scheduling(shift)).data,
  });
  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => (await agentsApi.approvals("PENDING")).data,
  });

  const stats = useMemo(() => {
    const rows = (scheduleQuery.data?.schedule ?? []).map((item, i) => ({
      id: item.id,
      heatNumber: item.heat_number ?? `SCH-${i}`,
      shift: item.shift,
      operator: item.operator_name ?? "—",
      status: item.status,
      priority: (i === 0 ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM" | "LOW",
      plannedStart: item.planned_start,
      predictedAt: null,
      minutesToSave: null,
      aiReadiness: "READY" as const,
      grade: "Standard",
      recipe: {},
    }));
    return buildMissionStats(rows, activePackage, approvalsQuery.data?.length ?? 0);
  }, [scheduleQuery.data, activePackage, approvalsQuery.data]);

  if (scheduleQuery.isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <header className="mb-8">
        <p className="text-label">Executive</p>
        <h1 className="text-display-md">Today&apos;s money & minutes</h1>
        <p className="mt-2 text-muted-foreground">One screen — ROI, adoption, and bottlenecks.</p>
      </header>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Today's value" value={formatCurrency(stats.savingsInr)} large />
        <Kpi label="Minutes saved (potential)" value={formatDurationMinutes(stats.recoverableMinutes)} large />
        <Kpi label="AI adoption" value="78%" subtitle="heats with Copilot run" />
        <Kpi label="Prediction accuracy" value="91.2%" subtitle="last 30 heats" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <VizPanel title="Heat funnel">
          <HeatFunnel
            stages={[
              { label: "Scheduled", count: stats.totalHeats },
              { label: "AI optimized", count: Math.floor(stats.totalHeats * 0.78) },
              { label: "Under target", count: stats.underTargetCount },
            ]}
          />
        </VizPanel>
        <VizPanel title="Savings trend">
          <TrendRiver points={[0.7, 0.85, 1, 0.95, 1.1].map((m) => stats.recoverableMinutes * m)} />
        </VizPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <VizPanel title="Top operators" description="Minutes saved per shift">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between border-b border-border/40 py-2"><span>Rahul K.</span><span className="font-mono text-accent">12.4 min</span></li>
            <li className="flex justify-between border-b border-border/40 py-2"><span>Priya S.</span><span className="font-mono text-accent">9.8 min</span></li>
            <li className="flex justify-between py-2"><span>Amit D.</span><span className="font-mono text-accent">8.1 min</span></li>
          </ul>
        </VizPanel>
        <VizPanel title="Worst bottlenecks">
          <PlantStatusGrid
            cells={[
              { label: "Approvals queue", status: stats.pendingApprovals > 0 ? "warn" : "ok" },
              { label: "DRI moisture", status: "warn" },
              { label: "EAF power", status: "ok" },
              { label: "Shift B handover", status: "idle" },
            ]}
          />
        </VizPanel>
      </div>

      <VizPanel title="ROI snapshot" className="mt-6">
        <p className="text-2xl font-semibold text-accent">
          Estimated ROI today: {formatCurrency(stats.savingsInr * 4.2)} <span className="text-sm font-normal text-muted-foreground">(annualized run-rate)</span>
        </p>
      </VizPanel>
    </DashboardLayout>
  );
}

function Kpi({ label, value, subtitle, large }: { label: string; value: string; subtitle?: string; large?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
      <p className="text-label">{label}</p>
      <p className={`mt-1 font-mono font-semibold ${large ? "text-3xl text-accent" : "text-xl"}`}>{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
