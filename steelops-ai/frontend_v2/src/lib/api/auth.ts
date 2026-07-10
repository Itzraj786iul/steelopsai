import {
  clearGuestSession,
  guestLogin,
  guestMe,
  guestRegister,
  guestTokens,
  isGuestAuthMode,
  setGuestSession,
} from "@/lib/auth/guest-auth";
import { eafClient } from "@/lib/api/eaf";
import { apiClient } from "@/services/api-client";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "@/types";
import type { MessageResponse } from "@/types/api.types";

export interface EnterpriseLoginResponse extends TokenResponse {
  user?: User & { permissions?: string[]; shift?: string | null; department_id?: string | null };
}

/** Prefer EAF enterprise auth unless explicitly in guest mode. */
function useEnterpriseAuth(): boolean {
  return !isGuestAuthMode() || process.env.NEXT_PUBLIC_AUTH_MODE === "enterprise";
}

export const authApi = {
  login: async (payload: LoginRequest) => {
    if (isGuestAuthMode() && process.env.NEXT_PUBLIC_AUTH_MODE !== "enterprise") {
      const { tokens, user } = await guestLogin(payload);
      setGuestSession(user.email);
      return { data: { ...tokens, user } as EnterpriseLoginResponse };
    }
    const { data } = await eafClient.post<EnterpriseLoginResponse>("/auth/login", payload);
    return { data };
  },
  register: async (payload: RegisterRequest) => {
    if (isGuestAuthMode() && process.env.NEXT_PUBLIC_AUTH_MODE !== "enterprise") {
      const user = await guestRegister(payload);
      return { data: user };
    }
    // Self-registration disabled in enterprise — admin creates users
    throw new Error("Self-registration is disabled. Contact your administrator.");
  },
  refresh: async (refreshToken: string) => {
    if (isGuestAuthMode() && process.env.NEXT_PUBLIC_AUTH_MODE !== "enterprise") {
      return { data: guestTokens() };
    }
    const { data } = await eafClient.post<TokenResponse>("/auth/refresh", { refresh_token: refreshToken });
    return { data };
  },
  logout: async (refreshToken?: string) => {
    if (isGuestAuthMode() && process.env.NEXT_PUBLIC_AUTH_MODE !== "enterprise") {
      clearGuestSession();
      return { data: { message: "Logged out" } as MessageResponse };
    }
    if (refreshToken) {
      try {
        await eafClient.post("/auth/logout", { refresh_token: refreshToken });
      } catch {
        /* ignore */
      }
    }
    return { data: { message: "Logged out" } as MessageResponse };
  },
  me: async () => {
    if (isGuestAuthMode() && process.env.NEXT_PUBLIC_AUTH_MODE !== "enterprise") {
      const user = guestMe();
      if (!user) throw new Error("Not authenticated");
      return { data: user };
    }
    const { data } = await eafClient.get<User>("/auth/me");
    return { data };
  },
  // Keep legacy platform client available if configured
  platformMe: () => apiClient.get<User>("/api/v1/auth/me"),
};

export { useEnterpriseAuth };
