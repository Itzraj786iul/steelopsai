import { apiClient } from "@/services/api-client";
import type { TapToTapPrediction } from "@/types/preheat.types";

export interface TapToTapPredictRequest {
  HM: number;
  DRI: number;
  CPC: number;
  LIME: number;
  DOLO?: number;
  HBI?: number;
  Bucket: number | string;
  Shift?: string;
  NH?: string;
  heat_id?: string;
  planned_start_time?: string;
}

export interface TapToTapPredictResponse {
  success: boolean;
  prediction: TapToTapPrediction;
}

export const tapToTapApi = {
  predict(payload: TapToTapPredictRequest) {
    return apiClient.post<TapToTapPredictResponse>("/api/v2/tap-to-tap/predict", payload);
  },
};
