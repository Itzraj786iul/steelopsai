"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { liveApi } from "@/lib/api/live";
import { heatsApi } from "@/lib/api/heats";
import { queryKeys } from "@/lib/query-keys";
import { realtimeService } from "@/services/websocket";
import { useLiveStore } from "@/stores/live-store";
import { usePreheatStore } from "@/stores/preheat-store";
import type { LiveHeatDetail } from "@/types/live.types";
import type { WsMessage } from "@/types";

export function useLiveHeat(heatId: string) {
  const queryClient = useQueryClient();
  const setDetail = useLiveStore((s) => s.setDetail);
  const preheatPkg = usePreheatStore((s) => s.activePackage);

  const detailQuery = useQuery({
    queryKey: queryKeys.live.heat(heatId),
    queryFn: async () => (await liveApi.getHeat(heatId)).data,
    refetchInterval: 30_000,
  });

  const timelineQuery = useQuery({
    queryKey: [...queryKeys.live.heat(heatId), "timeline"],
    queryFn: async () => (await liveApi.getTimeline(heatId)).data,
    refetchInterval: 30_000,
  });

  const predictedAtMin = preheatPkg?.target_heat_time_min ?? detailQuery.data?.prediction.at_predicted_min ?? 31;

  useEffect(() => {
    if (detailQuery.data) setDetail(detailQuery.data);
  }, [detailQuery.data, setDetail]);

  useEffect(() => {
    realtimeService.connectHeat(heatId);
    const unsubscribe = realtimeService.subscribe((message: WsMessage) => {
      if (message.type === "snapshot" || message.type === "heat_update") {
        const payload = message.payload as LiveHeatDetail;
        queryClient.setQueryData(queryKeys.live.heat(heatId), payload);
        setDetail(payload);
      }
      if (message.type === "live_heats_update") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.live.heats });
      }
    });

    return () => {
      unsubscribe();
      realtimeService.connectLiveHeats();
    };
  }, [heatId, queryClient, setDetail]);

  const refresh = useCallback(() => {
    void detailQuery.refetch();
    void timelineQuery.refetch();
  }, [detailQuery, timelineQuery]);

  return {
    detail: detailQuery.data,
    timeline: timelineQuery.data?.events ?? [],
    predictedAtMin,
    preheatPkg,
    isLoading: detailQuery.isLoading,
    isError: detailQuery.isError,
    refresh,
  };
}

export function useStartHeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ heatId, recipe }: { heatId: string; recipe?: Record<string, unknown> }) => {
      const payload = {
        status: "CHARGING",
        recipe_json: recipe,
        outcomes_json: {
          started_from: "copilot",
          started_at_client: new Date().toISOString(),
        },
      };
      return (await heatsApi.update(heatId, payload)).data;
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.live.heats });
      await queryClient.invalidateQueries({ queryKey: queryKeys.live.heat(variables.heatId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.heats.detail(variables.heatId) });
    },
  });
}

export function useLiveActions(heatId: string, detail?: LiveHeatDetail | null) {
  const queryClient = useQueryClient();
  const notes = useLiveStore((s) => s.notes);
  const addNote = useLiveStore((s) => s.addNote);
  const paused = useLiveStore((s) => s.paused);
  const setPaused = useLiveStore((s) => s.setPaused);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.live.heat(heatId) });
  }, [queryClient, heatId]);

  const updateHeat = useMutation({
    mutationFn: (data: Parameters<typeof heatsApi.update>[1]) => heatsApi.update(heatId, data),
    onSuccess: invalidate,
  });

  const acknowledgeAlert = useMutation({
    mutationFn: (alertId: string) => liveApi.acknowledgeAlert(alertId),
    onSuccess: invalidate,
  });

  const respondRecommendation = useMutation({
    mutationFn: ({ recId, response, comment }: { recId: string; response: "ACCEPT" | "REJECT"; comment?: string }) =>
      liveApi.respondRecommendation(heatId, recId, response, comment),
    onSuccess: invalidate,
  });

  const appendNote = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      addNote(text.trim());
      void updateHeat.mutateAsync({
        outcomes_json: {
          operator_notes: [...notes, text.trim()],
        },
      });
    },
    [addNote, notes, updateHeat]
  );

  const togglePause = useCallback(() => {
    const next = !paused;
    setPaused(next);
    void updateHeat.mutate({ status: next ? "PAUSED" : detail?.status ?? "MELTING" });
  }, [paused, setPaused, updateHeat, detail?.status]);

  const finishStage = useCallback(() => {
    const flow = ["CHARGING", "MELTING", "REFINING", "TAPPING", "COMPLETED"];
    const index = flow.indexOf(detail?.status ?? "CHARGING");
    const next = flow[Math.min(index + 1, flow.length - 1)];
    void updateHeat.mutate({ status: next, completed_at: next === "COMPLETED" ? new Date().toISOString() : undefined });
  }, [detail?.status, updateHeat]);

  const finishHeat = useCallback(() => {
    void updateHeat.mutate({ status: "COMPLETED", completed_at: new Date().toISOString() });
  }, [updateHeat]);

  const triggerEmergency = useCallback(() => {
    void updateHeat.mutate({
      outcomes_json: {
        emergency: true,
        emergency_at: new Date().toISOString(),
      },
    });
  }, [updateHeat]);

  return useMemo(
    () => ({
      appendNote,
      togglePause,
      finishStage,
      finishHeat,
      triggerEmergency,
      acknowledgeAlert,
      respondRecommendation,
      paused,
      isPending: updateHeat.isPending,
    }),
    [appendNote, togglePause, finishStage, finishHeat, triggerEmergency, acknowledgeAlert, respondRecommendation, paused, updateHeat.isPending]
  );
}
