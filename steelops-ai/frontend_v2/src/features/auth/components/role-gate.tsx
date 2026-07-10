"use client";

import { UserRole } from "@/lib/enums";
import { normalizeRole } from "@/lib/rbac/permissions";
import { useAuth } from "@/hooks/use-auth";

interface RoleGateProps {
  roles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role ?? UserRole.Operator);
  if (!roles.map(String).includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
