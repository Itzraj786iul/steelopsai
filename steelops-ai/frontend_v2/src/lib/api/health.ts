import { apiClient } from "@/services/api-client";

export const healthApi = {
  check: () => apiClient.get<{ status: string }>("/health"),
};
