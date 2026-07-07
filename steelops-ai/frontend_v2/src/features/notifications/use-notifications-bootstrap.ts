"use client";

import { useQuery } from "@tanstack/react-query";

import { agentsApi } from "@/lib/api/agents";
import { liveApi } from "@/lib/api/live";
import { normalizeLiveList } from "@/features/live/utils/live-utils";
import { queryKeys } from "@/lib/query-keys";
import { mapApprovalsToNotifications, mapLiveHeatsToNotifications } from "@/services/notifications";
import { useNotificationStore } from "@/stores/notification-store";
import { getAccessToken } from "@/services/api-client";
import { useEffect } from "react";

export function useNotificationsBootstrap() {
  const setItems = useNotificationStore((state) => state.setItems);
  const enabled = !!getAccessToken();

  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => {
      const response = await agentsApi.approvals("PENDING");
      return response.data;
    },
    enabled,
  });

  const liveQuery = useQuery({
    queryKey: queryKeys.live.heats,
    queryFn: async () => {
      const response = await liveApi.listHeats();
      return response.data;
    },
    enabled,
  });

  useEffect(() => {
    const approvalItems = mapApprovalsToNotifications(approvalsQuery.data ?? []);
    const liveItems = mapLiveHeatsToNotifications(normalizeLiveList(liveQuery.data ?? { items: [] }).items);
    setItems([...approvalItems, ...liveItems]);
  }, [approvalsQuery.data, liveQuery.data, setItems]);
}
