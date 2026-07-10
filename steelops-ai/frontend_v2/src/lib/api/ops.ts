import { eafClient } from "@/lib/api/eaf";

export const opsApi = {
  furnaces: () => eafClient.get("/ops/furnaces"),
  createFurnace: (body: { code: string; name: string; plant?: string; type?: string }) =>
    eafClient.post("/ops/furnaces", body),
  shifts: (includeArchived = false) =>
    eafClient.get("/ops/shifts", { params: { include_archived: includeArchived } }),
  createShift: (body: Record<string, unknown>) => eafClient.post("/ops/shifts", body),
  updateShift: (id: string, body: Record<string, unknown>) => eafClient.patch(`/ops/shifts/${id}`, body),
  assignShift: (id: string, body: { user_id: string; role_in_shift?: string }) =>
    eafClient.post(`/ops/shifts/${id}/assign`, body),
  queue: (params?: { status?: string; furnace_id?: string }) =>
    eafClient.get("/ops/queue", { params }),
  createQueue: (body: Record<string, unknown>) => eafClient.post("/ops/queue", body),
  updateQueue: (id: string, body: Record<string, unknown>) => eafClient.patch(`/ops/queue/${id}`, body),
  reorderQueue: (ordered_ids: string[]) => eafClient.post("/ops/queue/reorder", { ordered_ids }),
  handovers: () => eafClient.get("/ops/handovers"),
  createHandover: (body: Record<string, unknown>) => eafClient.post("/ops/handovers", body),
  ackHandover: (id: string, signature: string) =>
    eafClient.post(`/ops/handovers/${id}/acknowledge`, { signature }),
  approvals: (status?: string) => eafClient.get("/ops/approvals", { params: { status } }),
  startApproval: (body: { heat_number: string; heat_record_id?: string; comments?: string }) =>
    eafClient.post("/ops/approvals", body),
  approvalAction: (id: string, action: string, comments = "") =>
    eafClient.post(`/ops/approvals/${id}/action`, { action, comments }),
  tasks: (params?: { mine?: boolean; status?: string }) => eafClient.get("/ops/tasks", { params }),
  createTask: (body: Record<string, unknown>) => eafClient.post("/ops/tasks", body),
  updateTask: (id: string, body: Record<string, unknown>) => eafClient.patch(`/ops/tasks/${id}`, body),
  announcements: () => eafClient.get("/ops/announcements"),
  createAnnouncement: (body: Record<string, unknown>) => eafClient.post("/ops/announcements", body),
  calendar: (params?: { date_from?: string; date_to?: string }) =>
    eafClient.get("/ops/calendar", { params }),
  createCalendar: (body: Record<string, unknown>) => eafClient.post("/ops/calendar", body),
  search: (q: string) => eafClient.get("/ops/search", { params: { q } }),
  operatorPerf: (userId?: string) =>
    eafClient.get("/ops/dashboards/operator-performance", { params: { user_id: userId } }),
  productionDash: () => eafClient.get("/ops/dashboards/production-manager"),
  shiftPerf: (shift?: string) =>
    eafClient.get("/ops/dashboards/shift-performance", { params: { shift } }),
  analytics: () => eafClient.get("/ops/dashboards/analytics"),
  report: (kind: string) => eafClient.get(`/ops/reports/${kind}`),
  generateAlerts: () => eafClient.post("/ops/alerts/generate"),
};
