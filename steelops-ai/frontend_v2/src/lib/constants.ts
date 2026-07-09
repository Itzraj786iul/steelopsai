export const APP_NAME = "JSPL EAF TTT";
export const APP_VERSION = "1.0.0";
export const RESEARCH_VERSION = "Phase 33 (frozen)";
export const PRODUCTION_MODEL_PHASE = "Phase 19";
export const OPTIMIZER_PHASE = "Phase 20.2";
export const DATASET_VERSION = "Industrial EAF Heats (Phase 16 normal cohort)";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const EAF_API_URL = process.env.NEXT_PUBLIC_EAF_API_URL ?? "http://localhost:8001";
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? API_URL.replace(/^http/, "ws");
export const DEFAULT_PLANT_SLUG = process.env.NEXT_PUBLIC_DEFAULT_PLANT ?? "jspl-angul";
export const DEFAULT_TENANT_SLUG = "jspl-angul";

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
export const AUTH_COOKIE_KEY = "steelops_authenticated";

export const SIDEBAR_STORAGE_KEY = "steelops-sidebar-collapsed";
export const PLANT_STORAGE_KEY = "steelops-plant-context";

export const QUERY_STALE_TIME = 30_000;
export const QUERY_STATIC_STALE_TIME = 300_000;

export const SHIFTS = ["A", "B", "C"] as const;

export const PLANTS = [
  { id: "jspl-angul", name: "JSPL Angul", line: "EAF #1" },
  { id: "jspl-raigarh", name: "JSPL Raigarh", line: "EAF #1" },
] as const;
