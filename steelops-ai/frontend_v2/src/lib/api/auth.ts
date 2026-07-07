import {
  clearGuestSession,
  guestLogin,
  guestMe,
  guestRegister,
  guestTokens,
  isGuestAuthMode,
  setGuestSession,
} from "@/lib/auth/guest-auth";
import { apiClient } from "@/services/api-client";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "@/types";
import type { MessageResponse } from "@/types/api.types";

export const authApi = {
  login: async (payload: LoginRequest) => {
    if (isGuestAuthMode()) {
      const { tokens, user } = await guestLogin(payload);
      setGuestSession(user.email);
      return { data: tokens };
    }
    return apiClient.post<TokenResponse>("/api/v1/auth/login", payload);
  },
  register: async (payload: RegisterRequest) => {
    if (isGuestAuthMode()) {
      const user = await guestRegister(payload);
      return { data: user };
    }
    return apiClient.post<User>("/api/v1/auth/register", payload);
  },
  refresh: (refreshToken: string) =>
    isGuestAuthMode()
      ? Promise.resolve({ data: guestTokens() })
      : apiClient.post<TokenResponse>("/api/v1/auth/refresh", { refresh_token: refreshToken }),
  logout: async () => {
    if (isGuestAuthMode()) {
      clearGuestSession();
      return { data: { message: "Logged out" } as MessageResponse };
    }
    return apiClient.post<MessageResponse>("/api/v1/auth/logout");
  },
  me: async () => {
    if (isGuestAuthMode()) {
      const user = guestMe();
      if (!user) throw new Error("Not authenticated");
      return { data: user };
    }
    return apiClient.get<User>("/api/v1/auth/me");
  },
};
