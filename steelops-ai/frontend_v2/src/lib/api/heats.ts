import { apiClient } from "@/services/api-client";
import type { Heat, HeatListResponse } from "@/types";

export interface HeatUpdatePayload {
  shift?: string | null;
  status?: string | null;
  completed_at?: string | null;
  recipe_json?: Record<string, unknown> | null;
  chemistry_json?: Record<string, unknown> | null;
  outcomes_json?: Record<string, unknown> | null;
}

export const heatsApi = {
  list: (page = 1, pageSize = 20, status?: string) =>
    apiClient.get<HeatListResponse>("/api/v1/heats", {
      params: { page, page_size: pageSize, status },
    }),
  get: (id: string) => apiClient.get<Heat>(`/api/v1/heats/${id}`),
  update: (id: string, data: HeatUpdatePayload) => apiClient.patch<Heat>(`/api/v1/heats/${id}`, data),
};
