import { canAccessRoute, canApprove, getDefaultRouteForRole, normalizeRole } from "@/lib/rbac/permissions";
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
});
