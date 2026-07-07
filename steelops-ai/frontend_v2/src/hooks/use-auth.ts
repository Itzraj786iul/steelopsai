"use client";

import { useAuthContext } from "@/providers/auth-provider";
import { canAccessRoute, canApprove, canExport, canManageUsers, canAccessLabs } from "@/lib/rbac/permissions";
import { normalizeRole } from "@/lib/rbac/permissions";

export function useAuth() {
  return useAuthContext();
}

export function usePermissions() {
  const { user } = useAuthContext();
  const role = user?.role ?? "operator";

  return {
    role: normalizeRole(role),
    canAccessRoute: (path: string) => canAccessRoute(role, path),
    canApprove: () => canApprove(role),
    canExport: () => canExport(role),
    canManageUsers: () => canManageUsers(role),
    canAccessLabs: () => canAccessLabs(role),
  };
}
