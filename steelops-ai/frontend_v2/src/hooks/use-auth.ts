"use client";

import { useAuthContext } from "@/providers/auth-provider";
import {
  canAccessRoute,
  canApprove,
  canExport,
  canManageUsers,
  canAccessLabs,
  isNavItemVisible,
  normalizeRole,
} from "@/lib/rbac/permissions";

export function useAuth() {
  return useAuthContext();
}

export function usePermissions() {
  const { user } = useAuthContext();
  const role = user?.role ?? "operator";

  return {
    role: normalizeRole(role),
    canAccessRoute: (path: string) => canAccessRoute(role, path),
    canShowNavItem: (item: { href: string; roles?: string[] }) => isNavItemVisible(role, item),
    canApprove: () => canApprove(role),
    canExport: () => canExport(role),
    canManageUsers: () => canManageUsers(role),
    canAccessLabs: () => canAccessLabs(role),
  };
}
