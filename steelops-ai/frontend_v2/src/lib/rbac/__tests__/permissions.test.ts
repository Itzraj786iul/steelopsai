import {
  canAccessRoute,
  canApprove,
  getDefaultRouteForRole,
  isNavItemVisible,
  normalizeRole,
} from "@/lib/rbac/permissions";
import { UserRole } from "@/lib/enums";

describe("permissions", () => {
  it("normalizes role strings", () => {
    expect(normalizeRole("Process Engineer")).toBe(UserRole.QualityEngineer);
    expect(normalizeRole("shift_incharge")).toBe(UserRole.ShiftEngineer);
    expect(normalizeRole("administrator")).toBe(UserRole.Admin);
  });

  it("returns role-specific default routes", () => {
    expect(getDefaultRouteForRole("operator")).toBe("/eaf/prediction");
    expect(getDefaultRouteForRole("production_manager")).toBe("/eaf/shift-dashboard");
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

  it("hides operator floor tools from admin nav", () => {
    expect(isNavItemVisible("admin", { href: "/eaf/prediction", roles: [UserRole.Operator, UserRole.ShiftEngineer] })).toBe(
      false
    );
    expect(isNavItemVisible("admin", { href: "/eaf/live-board", roles: [UserRole.ShiftEngineer] })).toBe(false);
    expect(isNavItemVisible("admin", { href: "/eaf/users", roles: [UserRole.Admin] })).toBe(true);
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
});
