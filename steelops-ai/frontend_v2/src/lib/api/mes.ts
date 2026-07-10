import { eafClient } from "@/lib/api/eaf";

export const mesApi = {
  plans: (params?: Record<string, string | undefined>) => eafClient.get("/mes/plans", { params }),
  createPlan: (body: Record<string, unknown>) => eafClient.post("/mes/plans", body),
  getPlan: (id: string) => eafClient.get(`/mes/plans/${id}`),
  updatePlan: (id: string, body: Record<string, unknown>) => eafClient.patch(`/mes/plans/${id}`, body),
  heats: (params?: Record<string, string | number | boolean | undefined>) =>
    eafClient.get("/mes/heats", { params }),
  createHeat: (body: Record<string, unknown>) => eafClient.post("/mes/heats", body),
  getHeat: (id: string) => eafClient.get(`/mes/heats/${id}`),
  getHeatByNumber: (heatNumber: string) =>
    eafClient.get(`/mes/heats/by-number/${encodeURIComponent(heatNumber)}`),
  updateHeat: (id: string, body: Record<string, unknown>) => eafClient.patch(`/mes/heats/${id}`, body),
  setHeatStatus: (id: string, status: string) => eafClient.post(`/mes/heats/${id}/status`, { status }),
  timeline: (id: string) => eafClient.get(`/mes/heats/${id}/timeline`),
  aiEvent: (body: {
    heat_number: string;
    event: string;
    session_id?: string;
    heat_record_id?: string;
    recipe?: Record<string, unknown>;
  }) => eafClient.post("/mes/events/ai", body),
  liveBoard: (params?: { furnace_id?: string; shift?: string }) =>
    eafClient.get("/mes/live-board", { params }),
  kpiWall: (furnace_id?: string) => eafClient.get("/mes/kpi-wall", { params: { furnace_id } }),
  targets: (params?: { plan_id?: string; date?: string }) => eafClient.get("/mes/targets", { params }),
  shiftScorecard: (shift = "A", date?: string) =>
    eafClient.get("/mes/shift-scorecard", { params: { shift, date } }),
  furnaceUtil: (period = "daily", furnace_id = "EAF-1") =>
    eafClient.get("/mes/furnace-utilization", { params: { period, furnace_id } }),
  delayDashboard: () => eafClient.get("/mes/delay-dashboard"),
  operatorBoard: (operator_id?: string) =>
    eafClient.get("/mes/boards/operator", { params: { operator_id } }),
  supervisorBoard: (shift = "A", date?: string) =>
    eafClient.get("/mes/boards/supervisor", { params: { shift, date } }),
  plantBoard: () => eafClient.get("/mes/boards/plant-manager"),
  planningAnalytics: (params?: { date_from?: string; date_to?: string }) =>
    eafClient.get("/mes/analytics/planning", { params }),
  dashboardWidgets: () => eafClient.get("/mes/dashboard-widgets"),
  search: (q: string) => eafClient.get("/mes/search", { params: { q } }),
  report: (kind: string, params?: Record<string, string | undefined>) =>
    eafClient.get(`/mes/reports/${kind}`, { params }),
  export: (kind: string, fmt: "csv" | "excel" | "json" | "pdf" = "json", params?: Record<string, string | undefined>) =>
    eafClient.get(`/mes/export/${kind}`, {
      params: { fmt, ...params },
      responseType: fmt === "json" ? "json" : "blob",
    }),
};
