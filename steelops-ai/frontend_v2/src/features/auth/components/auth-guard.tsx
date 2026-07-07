"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { isGuestAuthMode } from "@/lib/auth/guest-auth";
import { getAccessToken } from "@/services/api-client";

interface AuthGuardProps {
  children: React.ReactNode;
  pathname: string;
}

const PUBLIC_ROUTE_PREFIXES = ["/eaf"];

export function AuthGuard({ children, pathname }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isPublicRoute = PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (isLoading || isPublicRoute) return;

    if (!isAuthenticated || !getAccessToken()) {
      if (isGuestAuthMode()) {
        router.replace("/eaf/dashboard");
        return;
      }
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, isPublicRoute, pathname, router, user]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="p-6">
        <PageLoadingSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}
