"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { VizPanel } from "@/components/industrial/primitives";
import { FinancialStoryStrip } from "@/features/executive/components/financial-story-strip";
import { ExecutiveStoryPanels, ExecutiveNarrative } from "@/features/executive/components/executive-story";
import { PlantOverviewMap } from "@/features/executive/components/plant-overview-map";
import { FinancialDashboard, PerformanceTrends, RootCausePareto } from "@/features/executive/components/executive-charts";
import { OperatorLeaderboard, ShiftIntelligence } from "@/features/executive/components/executive-intelligence";
import { AiRoiDashboard } from "@/features/executive/components/ai-roi-dashboard";
import { BoardPresentationMode } from "@/features/executive/components/board-presentation-mode";
import { ExportCenter } from "@/features/executive/components/export-center";
import {
  buildExecutiveSnapshot,
  buildStoryPanels,
  buildNarrative,
  buildFurnaceUnits,
  buildOperators,
  buildShiftMetrics,
  buildRootCauses,
  buildRoi,
} from "@/features/executive/utils/executive-metrics";
import { agentsApi } from "@/lib/api/agents";
import { plantApi } from "@/lib/api/optimization";
import { queryKeys } from "@/lib/query-keys";
import { usePlantContext } from "@/hooks/use-plant-context";
import { usePreheatStore } from "@/stores/preheat-store";

export function ExecutiveCommandCenter() {
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

  const derived = useMemo(() => {
    const schedule = scheduleQuery.data?.schedule ?? [];
    const totalHeats = schedule.length;
    const heatNumbers = schedule.map((s) => s.heat_number).filter(Boolean) as string[];
    const snapshot = buildExecutiveSnapshot(totalHeats, activePackage, approvalsQuery.data?.length ?? 0);
    return {
      snapshot,
      storyPanels: buildStoryPanels(snapshot),
      narrative: buildNarrative(snapshot),
      furnaces: buildFurnaceUnits(snapshot, heatNumbers),
      operators: buildOperators(),
      shifts: buildShiftMetrics(snapshot),
      rootCauses: buildRootCauses(snapshot),
      roi: buildRoi(snapshot),
    };
  }, [scheduleQuery.data, activePackage, approvalsQuery.data]);

  if (scheduleQuery.isLoading) {
    return (
      <PageContainer size="executive">
        <PageLoadingSkeleton />
      </PageContainer>
    );
  }

  const { snapshot, storyPanels, narrative, furnaces, operators, shifts, rootCauses, roi } = derived;

  return (
    <PageContainer size="executive">
      <BoardPresentationMode>
        <header className="mb-8">
          <p className="text-label">Boardroom · Executive command center</p>
          <h1 className="text-display-lg">The financial story of your plant</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Where money is made, where it is lost, and how AI is changing performance — in under 30 seconds.
          </p>
        </header>

        <div className="space-y-10">
          <FinancialStoryStrip snapshot={snapshot} />
          <ExecutiveStoryPanels panels={storyPanels} />
          <ExecutiveNarrative narrative={narrative} />

          <VizPanel title="Plant overview" description="Interactive furnace map — status, health, risk, savings">
            <PlantOverviewMap furnaces={furnaces} />
          </VizPanel>

          <FinancialDashboard snapshot={snapshot} />
          <PerformanceTrends snapshot={snapshot} />
          <div className="grid gap-6 lg:grid-cols-2">
            <OperatorLeaderboard operators={operators} />
            <ShiftIntelligence shifts={shifts} />
          </div>
          <RootCausePareto items={rootCauses} />
          <AiRoiDashboard roi={roi} />
          <ExportCenter snapshot={snapshot} />
        </div>
      </BoardPresentationMode>
    </PageContainer>
  );
}
