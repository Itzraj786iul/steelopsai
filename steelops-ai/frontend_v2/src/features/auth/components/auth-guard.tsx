"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/rbac/permissions";
import { getAccessToken } from "@/services/api-client";

interface AuthGuardProps {
  children: React.ReactNode;
  pathname: string;
}

export function AuthGuard({ children, pathname }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasToken = typeof window !== "undefined" && !!getAccessToken();
  const authed = isAuthenticated || hasToken;
  const isFeedbackRedirect = pathname.startsWith("/eaf/feedback");

  useEffect(() => {
    if (isLoading) return;

    if (!authed || !getAccessToken()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isFeedbackRedirect) {
      router.replace("/eaf/optimizer");
      return;
    }

    if (user && pathname.startsWith("/eaf") && !canAccessRoute(user.role, pathname)) {
      router.replace("/unauthorized");
    }
  }, [authed, isFeedbackRedirect, isLoading, pathname, router, user]);

  if (isLoading || !authed) {
    return (
      <div className="p-6">
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (isFeedbackRedirect) {
    return (
      <div className="p-6">
        <PageLoadingSkeleton />
      </div>
    );
  }

  if (user && pathname.startsWith("/eaf") && !canAccessRoute(user.role, pathname)) {
    return (
      <div className="p-6">
        <PageLoadingSkeleton />
      </div>
    );
  }

  return <>{children}</>;
}
