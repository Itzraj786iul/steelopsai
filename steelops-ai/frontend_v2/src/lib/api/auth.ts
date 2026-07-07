import { apiClient } from "@/services/api-client";
import type { LoginRequest, RegisterRequest, TokenResponse, User } from "@/types";
import type { MessageResponse } from "@/types/api.types";

export const authApi = {
  login: (payload: LoginRequest) => apiClient.post<TokenResponse>("/api/v1/auth/login", payload),
  register: (payload: RegisterRequest) => apiClient.post<User>("/api/v1/auth/register", payload),
  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>("/api/v1/auth/refresh", { refresh_token: refreshToken }),
  logout: () => apiClient.post<MessageResponse>("/api/v1/auth/logout"),
  me: () => apiClient.get<User>("/api/v1/auth/me"),
};
