import { apiClient } from "@/services/api-client";
import type { PreheatDecisionPackage, PreheatIntelligenceRequest } from "@/types/preheat.types";

export const preheatApi = {
  runIntelligence: (payload: PreheatIntelligenceRequest) =>
    apiClient.post<PreheatDecisionPackage>("/api/v2/preheat/intelligence", payload),
};
