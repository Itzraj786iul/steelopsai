export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  heats: {
    all: ["heats"] as const,
    list: (filters: Record<string, unknown>) => ["heats", "list", filters] as const,
    detail: (id: string) => ["heats", id] as const,
  },
  live: {
    heats: ["live", "heats"] as const,
    heat: (id: string) => ["live", "heat", id] as const,
  },
  approvals: {
    list: (status?: string) => ["approvals", status ?? "all"] as const,
    detail: (id: string) => ["approvals", id] as const,
  },
  plant: {
    overview: ["plant", "overview"] as const,
    multi: ["plant", "multi"] as const,
    scheduling: (shift: string) => ["plant", "scheduling", shift] as const,
  },
  preheat: {
    package: (id: string) => ["preheat", "package", id] as const,
    intelligence: (heatId?: string) => ["preheat", "intelligence", heatId ?? "draft"] as const,
  },
  recipes: {
    compare: (labels: string[]) => ["recipes", "compare", ...labels] as const,
  },
  health: {
    check: ["health"] as const,
  },
  notifications: {
    derived: ["notifications", "derived"] as const,
  },
  dashboard: {
    today: (shift: string) => ["dashboard", "today", shift] as const,
  },
  prediction: {
    history: (limit: number) => ["prediction", "history", limit] as const,
  },
};
