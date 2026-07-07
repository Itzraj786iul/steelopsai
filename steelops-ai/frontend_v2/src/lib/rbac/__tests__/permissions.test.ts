import { canAccessRoute, canApprove, getDefaultRouteForRole, normalizeRole } from "@/lib/rbac/permissions";
import { UserRole } from "@/lib/enums";

describe("permissions", () => {
  it("normalizes role strings", () => {
    expect(normalizeRole("Process Engineer")).toBe(UserRole.ProcessEngineer);
    expect(normalizeRole("shift_incharge")).toBe(UserRole.ShiftIncharge);
  });

  it("returns role-specific default routes", () => {
    expect(getDefaultRouteForRole("operator")).toBe("/copilot");
    expect(getDefaultRouteForRole("production_manager")).toBe("/planning/schedule");
    expect(getDefaultRouteForRole("developer")).toBe("/settings/developer");
  });

  it("restricts labs to authorized roles", () => {
    expect(canAccessRoute("operator", "/labs/optimization")).toBe(false);
    expect(canAccessRoute("process_engineer", "/labs/optimization")).toBe(true);
  });

  it("allows approval for shift incharge", () => {
    expect(canApprove("shift_incharge")).toBe(true);
    expect(canApprove("operator")).toBe(false);
  });
});
