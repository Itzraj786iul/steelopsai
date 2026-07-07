import { apiClient } from "@/services/api-client";
import type { RecipeCompareResponse, SchedulingResponse } from "@/types/preheat.types";

export interface RecipeInput {
  HM: number;
  DRI: number;
  CPC: number;
  LIME: number;
  DOLO: number;
  Bucket: number;
  F1_P?: number;
  F1_C?: number;
  Shift: string;
  "T C"?: number;
  HBI?: number;
}

export const optimizationApi = {
  compareRecipes: (recipes: RecipeInput[], labels?: string[]) =>
    apiClient.post<RecipeCompareResponse>("/api/v1/recipes/compare", { recipes, labels }),
};

export const plantApi = {
  scheduling: (shift = "A") =>
    apiClient.get<SchedulingResponse>("/api/v1/scheduling", { params: { shift } }),
};

export const predictionApi = {
  history: (limit = 50) =>
    apiClient.get<Array<Record<string, unknown>>>("/api/v1/ai/history", { params: { limit } }),
};
