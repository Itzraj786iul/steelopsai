import { apiClient } from "@/services/api-client";
import type {
  LiveAlertItem,
  LiveHeatDetail,
  LiveHeatListResponse,
  LiveRecommendationItem,
  OperatorActionResponse,
  PlantOverview,
  TimelineResponse,
} from "@/types/live.types";

export const liveApi = {
  listHeats: () => apiClient.get<LiveHeatListResponse>("/api/v1/live-heats"),
  getHeat: (heatId: string) => apiClient.get<LiveHeatDetail>(`/api/v1/heat/${heatId}/live`),
  getTimeline: (heatId: string) => apiClient.get<TimelineResponse>(`/api/v1/heat/${heatId}/timeline`),
  getAlerts: (heatId: string) => apiClient.get<LiveAlertItem[]>(`/api/v1/heat/${heatId}/alerts`),
  getRecommendations: (heatId: string) => apiClient.get<LiveRecommendationItem[]>(`/api/v1/heat/${heatId}/recommendations`),
  acknowledgeAlert: (alertId: string, escalation = false) =>
    apiClient.patch<LiveAlertItem>(`/api/v1/alerts/${alertId}/ack`, { escalation }),
  respondRecommendation: (heatId: string, recId: string, response: "ACCEPT" | "REJECT", comment?: string) =>
    apiClient.post<OperatorActionResponse>(`/api/v1/heat/${heatId}/recommendations/${recId}/respond`, {
      response,
      comment,
    }),
  plantOverview: () => apiClient.get<PlantOverview>("/api/v1/plant/overview"),
};
