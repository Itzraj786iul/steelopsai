export type { ApiError, MessageResponse, PaginatedResponse } from "./api.types";
export type { LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, User } from "./auth.types";
export type { Heat, HeatListResponse } from "./heat.types";
export type { LiveHeatListResponse, LiveHeatSummary, PlantOverview, WsMessage } from "./live.types";
export type { AgentApproval, AgentTask, NotificationItem } from "./notification.types";

export interface NavItem {
  href: string;
  label: string;
  badgeKey?: "heats" | "preheat" | "live" | "approvals";
  roles?: string[];
  children?: NavItem[];
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  href?: string;
  action?: () => void;
  group: "navigation" | "action" | "heat" | "operator" | "settings";
  keywords?: string[];
}
