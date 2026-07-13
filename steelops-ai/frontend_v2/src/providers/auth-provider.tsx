"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect } from "react";

import { authApi } from "@/lib/api/auth";
import { isGuestAuthMode } from "@/lib/auth/guest-auth";
import { queryKeys } from "@/lib/query-keys";
import { getDefaultRouteForRole } from "@/lib/rbac/permissions";
import { getAccessToken } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isHydrated, setUser, clearAuth } = useAuthStore();

  const { isLoading: isMeLoading, isFetching } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const response = await authApi.me();
      setUser(response.data);
      return response.data;
    },
    enabled: isHydrated && !!getAccessToken() && !isGuestAuthMode() && !user,
    retry: false,
  });

  useEffect(() => {
    if (isHydrated && !getAccessToken()) {
      clearAuth();
    }
  }, [clearAuth, isHydrated]);

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // proceed with local logout
    }
    clearAuth();
    window.location.assign("/login");
  };

  // Don't flip back into a blocking loading state after login already set the user.
  const isLoading = !isHydrated || ((isMeLoading || isFetching) && !user && !!getAccessToken());

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: isAuthenticated || !!user || !!getAccessToken(),
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

export function useDefaultRoute(role?: string) {
  return role ? getDefaultRouteForRole(role) : "/copilot";
}
