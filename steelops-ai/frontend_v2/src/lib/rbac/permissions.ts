import { UserRole } from "@/lib/enums";

const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  [UserRole.Operator]: "/eaf/prediction",
  [UserRole.ProcessEngineer]: "/eaf/prediction",
  [UserRole.ShiftIncharge]: "/eaf/dashboard",
  [UserRole.ProductionManager]: "/eaf/optimizer",
  [UserRole.PlantHead]: "/eaf/dashboard",
  [UserRole.CorporateManagement]: "/eaf/reports",
  [UserRole.Administrator]: "/eaf/model",
  [UserRole.Developer]: "/eaf/model",
};

const ROUTE_ROLE_ACCESS: Record<string, UserRole[]> = {
  "/labs/optimization": [UserRole.ProcessEngineer, UserRole.ProductionManager, UserRole.PlantHead, UserRole.Developer],
  "/labs/simulation": [UserRole.ProcessEngineer, UserRole.ProductionManager, UserRole.PlantHead, UserRole.Developer],
  "/settings/users": [UserRole.Administrator],
  "/settings/governance": [UserRole.Administrator],
  "/settings/governance/models": [UserRole.Administrator, UserRole.ProcessEngineer],
  "/settings/developer": [UserRole.Developer, UserRole.Administrator],
  "/executive/multi-plant": [UserRole.CorporateManagement, UserRole.PlantHead, UserRole.Administrator],
};

export function normalizeRole(role: string): UserRole {
  const normalized = role.toLowerCase().replace(/\s+/g, "_") as UserRole;
  if (Object.values(UserRole).includes(normalized)) {
    return normalized;
  }
  return UserRole.Operator;
}

export function getDefaultRouteForRole(role: string): string {
  return ROLE_DEFAULT_ROUTES[normalizeRole(role)] ?? "/eaf/dashboard";
}

export function canAccessRoute(role: string, path: string): boolean {
  if (path.startsWith("/eaf") || path === "/") return true;
  const normalizedRole = normalizeRole(role);
  const restricted = Object.entries(ROUTE_ROLE_ACCESS).find(([route]) =>
    path === route || path.startsWith(`${route}/`)
  );
  if (!restricted) return true;
  return restricted[1].includes(normalizedRole);
}

export function canApprove(role: string): boolean {
  const normalizedRole = normalizeRole(role);
  return [
    UserRole.ShiftIncharge,
    UserRole.ProductionManager,
    UserRole.PlantHead,
    UserRole.Administrator,
  ].includes(normalizedRole);
}

export function canAccessLabs(role: string): boolean {
  return canAccessRoute(role, "/labs/optimization");
}

export function canManageUsers(role: string): boolean {
  return normalizeRole(role) === UserRole.Administrator;
}

export function canExport(role: string): boolean {
  const normalizedRole = normalizeRole(role);
  return normalizedRole !== UserRole.Operator;
}
