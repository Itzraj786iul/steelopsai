"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { buildPortfolioView } from "@/features/copilot/utils/copilot-utils";
import { heatToIntelligenceRequest } from "@/features/preheat/utils/preheat-utils";
import { usePlantContext } from "@/hooks/use-plant-context";
import { heatsApi } from "@/lib/api/heats";
import { plantApi } from "@/lib/api/optimization";
import { preheatApi } from "@/lib/api/preheat";
import { queryKeys } from "@/lib/query-keys";
import { useCopilotStore } from "@/stores/copilot-store";
import { usePreheatStore } from "@/stores/preheat-store";
import type { ScheduleItem } from "@/types/preheat.types";
import type { Heat } from "@/types/heat.types";

function resolveHeatId(
  explicitId: string | null,
  storedId: string | null,
  schedule: ScheduleItem[],
  heats: Heat[]
): string | null {
  const candidate = explicitId ?? storedId;
  if (candidate) return candidate;
  const firstScheduled = schedule[0];
  if (!firstScheduled?.heat_number) return heats[0]?.id ?? null;
  const match = heats.find((heat) => heat.heat_number === firstScheduled.heat_number);
  return match?.id ?? heats[0]?.id ?? null;
}

export function useCopilotWorkspace(initialHeatId: string | null) {
  const queryClient = useQueryClient();
  const { shift } = usePlantContext();
  const storedHeatId = useCopilotStore((s) => s.activeHeatId);
  const selectedPortfolio = useCopilotStore((s) => s.selectedPortfolio);
  const setActiveHeatId = useCopilotStore((s) => s.setActiveHeatId);
  const setActivePackage = usePreheatStore((s) => s.setActivePackage);

  const scheduleQuery = useQuery({
    queryKey: queryKeys.dashboard.today(shift),
    queryFn: async () => (await plantApi.scheduling(shift)).data,
  });

  const heatsQuery = useQuery({
    queryKey: queryKeys.heats.list({ page: 1, status: "PLANNED" }),
    queryFn: async () => {
      const planned = (await heatsApi.list(1, 50, "PLANNED")).data;
      if (planned.items.length > 0) return planned;
      // Demo/dev fallback: seed data often has live heats only (MELTING/REFINING/TAPPING)
      return (await heatsApi.list(1, 50)).data;
    },
  });

  const heatId = useMemo(
    () =>
      resolveHeatId(
        initialHeatId,
        storedHeatId,
        scheduleQuery.data?.schedule ?? [],
        heatsQuery.data?.items ?? []
      ),
    [initialHeatId, storedHeatId, scheduleQuery.data, heatsQuery.data]
  );

  const heatQuery = useQuery({
    queryKey: queryKeys.heats.detail(heatId ?? "none"),
    queryFn: async () => (await heatsApi.get(heatId!)).data,
    enabled: !!heatId,
  });

  const cachedPkg = usePreheatStore((s) => s.activePackage);
  const cachedHeatId = usePreheatStore((s) => s.activeHeatId);

  const analysis = useMutation({
    mutationKey: queryKeys.preheat.intelligence(heatId ?? undefined),
    mutationFn: async (payload: ReturnType<typeof heatToIntelligenceRequest>) => {
      const response = await preheatApi.runIntelligence(payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      setActivePackage(data, variables.heat_id ?? null);
    },
  });

  const pkg =
    analysis.data ?? (cachedHeatId && cachedHeatId === heatId ? cachedPkg : null);

  const portfolio = useMemo(() => (pkg ? buildPortfolioView(pkg, selectedPortfolio) : null), [pkg, selectedPortfolio]);

  const scheduleItem = useMemo(() => {
    const heat = heatQuery.data;
    if (!heat || !scheduleQuery.data) return undefined;
    return scheduleQuery.data.schedule.find((item) => item.heat_number === heat.heat_number);
  }, [heatQuery.data, scheduleQuery.data]);

  const runAnalysis = useCallback(() => {
    if (!heatQuery.data) return;
    const request = heatToIntelligenceRequest(heatQuery.data.recipe_json, {
      shift: heatQuery.data.shift,
      heatId: heatQuery.data.id,
      plannedStart: heatQuery.data.started_at,
    });
    analysis.mutate(request);
  }, [heatQuery.data, analysis]);

  useEffect(() => {
    if (heatId) setActiveHeatId(heatId);
  }, [heatId, setActiveHeatId]);

  useEffect(() => {
    if (!heatQuery.data || analysis.isPending || analysis.isSuccess) return;
    runAnalysis();
  }, [heatQuery.data, analysis.isPending, analysis.isSuccess, runAnalysis]);

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.heats.detail(heatId ?? "none") });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.today(shift) });
    analysis.reset();
    if (heatQuery.data) runAnalysis();
  }, [queryClient, heatId, shift, analysis, heatQuery.data, runAnalysis]);

  const loadHeat = useCallback(
    (nextHeatId: string) => {
      setActiveHeatId(nextHeatId);
      setActivePackage(null, null);
      analysis.reset();
    },
    [setActiveHeatId, setActivePackage, analysis]
  );

  const heatRows = useMemo(() => {
    const heatMap = new Map((heatsQuery.data?.items ?? []).map((heat) => [heat.heat_number, heat]));
    const fromSchedule = (scheduleQuery.data?.schedule ?? [])
      .map((item) => {
        const heat = item.heat_number ? heatMap.get(item.heat_number) : undefined;
        if (!heat) return null;
        return {
          heatId: heat.id,
          heatNumber: item.heat_number ?? heat.heat_number,
          operator: item.operator_name ?? "Unassigned",
          shift: item.shift ?? "—",
          status: item.status,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (fromSchedule.length > 0) return fromSchedule;

    return (heatsQuery.data?.items ?? []).map((heat) => ({
      heatId: heat.id,
      heatNumber: heat.heat_number,
      operator: "—",
      shift: heat.shift ?? "—",
      status: heat.status,
    }));
  }, [scheduleQuery.data, heatsQuery.data]);

  return {
    heatId,
    heat: heatQuery.data,
    scheduleItem,
    schedule: scheduleQuery.data?.schedule ?? [],
    heatRows,
    pkg,
    portfolio,
    isLoading: scheduleQuery.isLoading || heatsQuery.isLoading || heatQuery.isLoading || analysis.isPending,
    isError: scheduleQuery.isError || heatsQuery.isError || heatQuery.isError || analysis.isError,
    error: analysis.error ?? heatQuery.error ?? scheduleQuery.error,
    refresh,
    loadHeat,
  };
}
