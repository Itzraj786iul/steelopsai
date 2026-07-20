import { UserRole } from "@/lib/enums";
import { OPERATOR_CONSOLE_ROUTES } from "@/lib/navigation";

const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  [UserRole.Admin]: "/eaf/admin",
  [UserRole.PlantManager]: "/eaf/shift-dashboard",
  [UserRole.ProductionManager]: "/eaf/shift-dashboard",
  [UserRole.ShiftEngineer]: "/eaf/prediction",
  [UserRole.Operator]: "/eaf/prediction",
  [UserRole.QualityEngineer]: "/eaf/validation",
  [UserRole.MaintenanceEngineer]: "/eaf/delays",
  [UserRole.DataScientist]: "/eaf/model",
  [UserRole.Viewer]: "/eaf/heat-history",
};

/** Route prefix → roles allowed (admin always allowed via normalize). */
const ROUTE_ROLE_ACCESS: Record<string, string[]> = {
  "/eaf/admin": [UserRole.Admin],
  "/eaf/users": [UserRole.Admin],
  "/eaf/audit-log": [UserRole.Admin, UserRole.Viewer, UserRole.PlantManager],
  "/eaf/plant-dashboard": [UserRole.Admin, UserRole.PlantManager],
  "/eaf/system-health": [UserRole.Admin, UserRole.DataScientist, UserRole.PlantManager],
  "/eaf/deployment-readiness": [UserRole.Admin, UserRole.PlantManager, UserRole.DataScientist],
  "/eaf/versions": [UserRole.Admin, UserRole.DataScientist],
  "/eaf/performance": [UserRole.Admin, UserRole.DataScientist],
  "/eaf/session-backup": [UserRole.Admin],
  "/eaf/settings": [UserRole.Admin, UserRole.PlantManager],
  "/eaf/docs": [UserRole.Admin, UserRole.PlantManager, UserRole.DataScientist, UserRole.Viewer],
  "/eaf/delays": [
    UserRole.Admin,
    UserRole.MaintenanceEngineer,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
  ],
  "/eaf/alerts": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.MaintenanceEngineer,
    UserRole.QualityEngineer,
    UserRole.DataScientist,
    UserRole.Viewer,
  ],
  "/eaf/notifications": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.QualityEngineer,
    UserRole.MaintenanceEngineer,
    UserRole.DataScientist,
    UserRole.Viewer,
  ],
  "/eaf/feedback": [],
  "/eaf/historical": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.DataScientist,
    UserRole.QualityEngineer,
  ],
  "/eaf/health": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.MaintenanceEngineer,
  ],
  "/eaf/research": [UserRole.Admin, UserRole.DataScientist, UserRole.QualityEngineer],
  "/eaf/model": [UserRole.Admin, UserRole.DataScientist, UserRole.QualityEngineer],
  "/eaf/reliability": [UserRole.Admin, UserRole.DataScientist, UserRole.QualityEngineer, UserRole.PlantManager],
  "/eaf/explainability": [UserRole.Admin, UserRole.DataScientist, UserRole.QualityEngineer],
  "/eaf/audit/predictions": [UserRole.Admin, UserRole.PlantManager, UserRole.ProductionManager, UserRole.Viewer],
  "/eaf/audit/recommendations": [UserRole.Admin, UserRole.PlantManager, UserRole.ProductionManager, UserRole.Viewer],
  "/eaf/reports": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.Operator,
    UserRole.QualityEngineer,
    UserRole.MaintenanceEngineer,
    UserRole.DataScientist,
    UserRole.Viewer,
  ],
  "/eaf/heat-history": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.QualityEngineer,
    UserRole.MaintenanceEngineer,
    UserRole.DataScientist,
    UserRole.Viewer,
    UserRole.Operator,
  ],
  "/eaf/shift-dashboard": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.MaintenanceEngineer,
  ],
  "/eaf/optimizer": [
    UserRole.Admin,
    UserRole.Operator,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
  ],
  "/eaf/prediction": [
    UserRole.Admin,
    UserRole.Operator,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
  ],
  "/eaf/whatif": [
    UserRole.Admin,
    UserRole.Operator,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
  ],
  "/eaf/validation": [
    UserRole.Admin,
    UserRole.Operator,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
    UserRole.QualityEngineer,
  ],
  "/eaf/dashboard": [
    UserRole.Admin,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
    UserRole.PlantManager,
  ],
  "/eaf/shifts": [UserRole.Admin, UserRole.PlantManager, UserRole.ProductionManager, UserRole.ShiftEngineer],
  "/eaf/furnaces": [UserRole.Admin, UserRole.PlantManager, UserRole.ProductionManager],
  "/eaf/heat-queue": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
  ],
  "/eaf/shift-handover": [UserRole.Admin, UserRole.ProductionManager, UserRole.ShiftEngineer],
  "/eaf/approvals": [
    UserRole.Admin,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.PlantManager,
  ],
  "/eaf/tasks": [
    UserRole.Admin,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
    UserRole.PlantManager,
    UserRole.QualityEngineer,
    UserRole.MaintenanceEngineer,
  ],
  "/eaf/calendar": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.MaintenanceEngineer,
  ],
  "/eaf/announcements": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.Operator,
    UserRole.Viewer,
  ],
  "/eaf/search": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.Viewer,
  ],
  "/eaf/operator-performance": [
    UserRole.Admin,
    UserRole.Operator,
    UserRole.ShiftEngineer,
    UserRole.ProductionManager,
    UserRole.PlantManager,
  ],
  "/eaf/production-manager": [UserRole.Admin, UserRole.ProductionManager, UserRole.PlantManager],
  "/eaf/ops-reports": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.Viewer,
  ],
  "/eaf/production-plan": [UserRole.Admin, UserRole.PlantManager, UserRole.ProductionManager],
  "/eaf/heat-scheduler": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
  ],
  "/eaf/live-board": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
  ],
  "/eaf/kpi-wall": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
  ],
  "/eaf/operator-board": [UserRole.Admin, UserRole.ShiftEngineer],
  "/eaf/supervisor-board": [UserRole.Admin, UserRole.ShiftEngineer, UserRole.ProductionManager],
  "/eaf/plant-manager-board": [UserRole.Admin, UserRole.PlantManager, UserRole.ProductionManager],
  "/eaf/production-timeline": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
  ],
  "/eaf/delay-dashboard": [
    UserRole.Admin,
    UserRole.MaintenanceEngineer,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.PlantManager,
  ],
  "/eaf/mes-reports": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.Viewer,
  ],
  "/eaf/mes-search": [
    UserRole.Admin,
    UserRole.PlantManager,
    UserRole.ProductionManager,
    UserRole.ShiftEngineer,
    UserRole.Viewer,
  ],
};

const LEGACY_ROLE_MAP: Record<string, string> = {
  administrator: UserRole.Admin,
  plant_head: UserRole.PlantManager,
  corporate_management: UserRole.PlantManager,
  production_manager: UserRole.ProductionManager,
  shift_incharge: UserRole.ShiftEngineer,
  process_engineer: UserRole.QualityEngineer,
  developer: UserRole.DataScientist,
  operator: UserRole.Operator,
};

export function normalizeRole(role: string): string {
  const normalized = role.toLowerCase().replace(/\s+/g, "_");
  if (LEGACY_ROLE_MAP[normalized]) return LEGACY_ROLE_MAP[normalized];
  if (Object.values(UserRole).includes(normalized as UserRole)) return normalized;
  return UserRole.Operator;
}

export function getDefaultRouteForRole(role: string): string {
  return ROLE_DEFAULT_ROUTES[normalizeRole(role)] ?? "/eaf/prediction";
}

function pathMatchesRoute(path: string, route: string): boolean {
  return path === route || path.startsWith(`${route}/`) || path.startsWith(`${route}?`);
}

function isOperatorConsolePath(path: string): boolean {
  const bare = path.split("?")[0] ?? path;
  return OPERATOR_CONSOLE_ROUTES.some((route) => bare === route || bare.startsWith(`${route}/`));
}

export function canAccessRoute(role: string, path: string): boolean {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === UserRole.Admin) return true;

  // Core open paths for authenticated users
  if (path === "/" || path === "/eaf/about" || path === "/unauthorized") return true;

  // Feedback is retired — no role should land here (page also redirects).
  if (pathMatchesRoute(path, "/eaf/feedback")) return false;

  const restricted = Object.entries(ROUTE_ROLE_ACCESS)
    .filter(([route]) => pathMatchesRoute(path, route))
    .sort((a, b) => b[0].length - a[0].length)[0];

  if (restricted) {
    // Empty allow-list = nobody (except admin above)
    if (!restricted[1].length) return false;
    return restricted[1].includes(normalizedRole);
  }

  if (path.startsWith("/eaf")) {
    // Operators: only the heat console + What-if / About / Announcements
    if (normalizedRole === UserRole.Operator) {
      return isOperatorConsolePath(path);
    }
    return [
      UserRole.ShiftEngineer,
      UserRole.ProductionManager,
      UserRole.PlantManager,
      UserRole.QualityEngineer,
      UserRole.MaintenanceEngineer,
      UserRole.DataScientist,
      UserRole.Viewer,
    ].includes(normalizedRole as UserRole);
  }
  return true;
}

/** Sidebar / command palette visibility — role-curated, independent of deep-link access. */
export function isNavItemVisible(role: string, item: { href: string; roles?: string[] }): boolean {
  const normalizedRole = normalizeRole(role);
  if (!canAccessRoute(normalizedRole, item.href)) return false;
  if (!item.roles?.length) return true;
  return item.roles.includes(normalizedRole);
}

export function canApprove(role: string): boolean {
  return [UserRole.ShiftEngineer, UserRole.ProductionManager, UserRole.PlantManager, UserRole.Admin].includes(
    normalizeRole(role) as UserRole
  );
}

export function canAccessLabs(role: string): boolean {
  return canAccessRoute(role, "/eaf/research");
}

export function canManageUsers(role: string): boolean {
  return normalizeRole(role) === UserRole.Admin;
}

export function canExport(role: string): boolean {
  return normalizeRole(role) !== UserRole.Operator;
}

export function hasPermission(permissions: string[] | undefined, code: string): boolean {
  if (!permissions?.length) return false;
  return permissions.includes(code);
}
