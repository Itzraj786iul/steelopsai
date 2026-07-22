"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/hooks/use-auth";
import { canAccessRoute } from "@/lib/rbac/permissions";
import { getAccessToken } from "@/services/api-client";

interface AuthGuardProps {
  children: React.ReactNode;
  pathname: string;
}

/**
 * Keep the shell visible. Only redirect when we know auth failed —
 * never blank the whole app while hydrating or refreshing /me.
 */
export function AuthGuard({ children, pathname }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasToken = typeof window !== "undefined" && !!getAccessToken();
  const authed = isAuthenticated || hasToken;
  const isFeedbackRedirect = pathname.startsWith("/eaf/feedback");

  useEffect(() => {
    // Wait for persist hydrate before deciding to kick to login.
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

  // Soft gate: if we already have a token/user, render immediately.
  if (authed && !isFeedbackRedirect) {
    if (user && pathname.startsWith("/eaf") && !canAccessRoute(user.role, pathname)) {
      return (
        <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
          Checking access…
        </div>
      );
    }
    return <>{children}</>;
  }

  // No token yet — tiny placeholder while hydrate/redirect runs (not a full skeleton wall).
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-sm text-muted-foreground">
      {isLoading ? "Restoring session…" : "Redirecting to sign in…"}
    </div>
  );
}
