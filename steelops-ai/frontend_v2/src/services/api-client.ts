import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

import {
  ACCESS_TOKEN_KEY,
  API_URL,
  AUTH_COOKIE_KEY,
  REFRESH_TOKEN_KEY,
} from "@/lib/constants";
import type { ApiError } from "@/types";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(accessToken: string, refreshToken: string, maxAgeSeconds?: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  const maxAge = maxAgeSeconds ?? 60 * 60 * 8;
  document.cookie = `${AUTH_COOKIE_KEY}=1; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearAuthTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  document.cookie = `${AUTH_COOKIE_KEY}=; path=/; max-age=0; SameSite=Lax`;
}

export function getWsBaseUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return apiUrl.replace(/^http/, "ws");
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post<{ access_token: string; refresh_token: string; expires_in: number }>(
      `${API_URL}/api/v1/auth/refresh`,
      { refresh_token: refreshToken }
    );
    setAuthTokens(data.access_token, data.refresh_token, data.expires_in);
    return data.access_token;
  } catch {
    clearAuthTokens();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status === 401 &&
      typeof window !== "undefined" &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(originalRequest);
      }
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      return "Request timed out. The model may still be loading — please try again in a moment.";
    }
    if (!error.response) {
      return "Cannot reach the API. Verify the backend is running and your network connection is stable.";
    }
    const data = error.response.data as ApiError & {
      detail?: string | Array<{ msg?: string; loc?: string[] }>;
    };
    if (typeof data?.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data?.detail)) {
      return data.detail.map((item) => item.msg ?? JSON.stringify(item)).join("; ");
    }
    return data?.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function isOfflineError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response;
}
