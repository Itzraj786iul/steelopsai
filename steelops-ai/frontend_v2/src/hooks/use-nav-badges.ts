"use client";

import { useQuery } from "@tanstack/react-query";

import { agentsApi } from "@/lib/api/agents";
import { normalizeLiveList } from "@/features/live/utils/live-utils";
import { liveApi } from "@/lib/api/live";
import { queryKeys } from "@/lib/query-keys";
import { getAccessToken } from "@/services/api-client";

export function useNavBadges() {
  const enabled = !!getAccessToken();

  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => (await agentsApi.approvals("PENDING")).data,
    enabled,
  });

  const liveQuery = useQuery({
    queryKey: queryKeys.live.heats,
    queryFn: async () => (await liveApi.listHeats()).data,
    enabled,
  });

  return {
    approvals: approvalsQuery.data?.length ?? 0,
    live: normalizeLiveList(liveQuery.data ?? { items: [] }).total,
    heats: normalizeLiveList(liveQuery.data ?? { items: [] }).total,
    preheat: approvalsQuery.data?.length ? 1 : 0,
  };
}
