import {
  canAccessRoute,
  canApprove,
  getDefaultRouteForRole,
  isNavItemVisible,
  normalizeRole,
} from "@/lib/rbac/permissions";
import { UserRole } from "@/lib/enums";
import { ADMIN_NAV, OPERATIONS_NAV, PRODUCTION_NAV, TOOLS_NAV } from "@/lib/navigation";

describe("permissions", () => {
  it("normalizes role strings", () => {
    expect(normalizeRole("Process Engineer")).toBe(UserRole.QualityEngineer);
    expect(normalizeRole("shift_incharge")).toBe(UserRole.ShiftEngineer);
    expect(normalizeRole("administrator")).toBe(UserRole.Admin);
  });

  it("returns role-specific default routes", () => {
    expect(getDefaultRouteForRole("operator")).toBe("/eaf/prediction");
    expect(getDefaultRouteForRole("production_manager")).toBe("/eaf/production-manager");
    expect(getDefaultRouteForRole("plant_manager")).toBe("/eaf/plant-manager-board");
    expect(getDefaultRouteForRole("admin")).toBe("/eaf/admin");
  });

  it("restricts admin pages", () => {
    expect(canAccessRoute("operator", "/eaf/users")).toBe(false);
    expect(canAccessRoute("admin", "/eaf/users")).toBe(true);
  });

  it("allows approval for shift engineer", () => {
    expect(canApprove("shift_engineer")).toBe(true);
    expect(canApprove("operator")).toBe(false);
  });

  it("keeps operator on the heat console", () => {
    expect(canAccessRoute("operator", "/eaf/prediction")).toBe(true);
    expect(canAccessRoute("operator", "/eaf/optimizer")).toBe(true);
    expect(canAccessRoute("operator", "/eaf/whatif")).toBe(true);
    expect(canAccessRoute("operator", "/eaf/live-board")).toBe(false);
    expect(canAccessRoute("operator", "/eaf/historical")).toBe(false);
    expect(canAccessRoute("operator", "/eaf/feedback")).toBe(false);
    expect(isNavItemVisible("operator", { href: "/eaf/live-board", roles: [UserRole.ShiftEngineer] })).toBe(false);
    expect(isNavItemVisible("shift_engineer", { href: "/eaf/live-board", roles: [UserRole.ShiftEngineer] })).toBe(true);
  });

  it("keeps Administration nav slim for Admin", () => {
    const adminAdminLinks = ADMIN_NAV.filter((i) => i.roles?.includes(UserRole.Admin)).map((i) => i.href);
    expect(adminAdminLinks).toEqual(
      expect.arrayContaining(["/eaf/admin", "/eaf/users", "/eaf/audit-log", "/eaf/settings", "/eaf/session-backup"])
    );
    expect(adminAdminLinks).not.toContain("/eaf/alerts");
    expect(adminAdminLinks).not.toContain("/eaf/search");
    expect(adminAdminLinks).not.toContain("/eaf/announcements");
    expect(adminAdminLinks).not.toContain("/eaf/system-health");
  });

  it("puts plant comms under Tools not Administration", () => {
    expect(isNavItemVisible("operator", TOOLS_NAV.find((i) => i.href === "/eaf/announcements")!)).toBe(true);
    expect(isNavItemVisible("plant_manager", TOOLS_NAV.find((i) => i.href === "/eaf/alerts")!)).toBe(true);
    expect(ADMIN_NAV.some((i) => i.href === "/eaf/alerts")).toBe(false);
  });

  it("collapses duplicate MES boards from default Operations nav", () => {
    const opsHrefs = OPERATIONS_NAV.map((i) => i.href);
    expect(opsHrefs).toContain("/eaf/shift-dashboard");
    expect(opsHrefs).toContain("/eaf/live-board");
    expect(opsHrefs).toContain("/eaf/production-manager");
    expect(opsHrefs).toContain("/eaf/plant-manager-board");
    expect(opsHrefs).not.toContain("/eaf/kpi-wall");
    expect(opsHrefs).not.toContain("/eaf/supervisor-board");
    expect(PRODUCTION_NAV.some((i) => i.href === "/eaf/dashboard")).toBe(false);
  });
});
