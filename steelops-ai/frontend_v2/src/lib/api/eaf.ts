import axios from "axios";

import { EAF_API_URL } from "@/lib/constants";

export interface EafRecipe {
  HM: number;
  DRI: number;
  HBI: number;
  Bucket: number;
  LIME: number;
  DOLO: number;
  CPC: number;
  POWER: number;
  OXY: number;
  Shift: "A" | "B" | "C";
  Power_Restriction: 0 | 1;
}

export interface ValidationWarning {
  level: string;
  message: string;
}

export interface ContributorItem {
  feature: string;
  display_name?: string;
  contribution: number;
  global_importance?: number;
}

export interface PredictResponse {
  predicted_ttt: number;
  margin: number;
  ci_lower_95: number;
  ci_upper_95: number;
  top_contributors: ContributorItem[];
  operator_summary: Record<string, string>;
  validation_warnings: ValidationWarning[];
}

export interface OptimizationRow {
  variable: string;
  current: number;
  optimized: number;
  difference: number;
  pct_change: number;
  arrow: string;
  reason: string;
  physics_status: string;
}

export interface OptimizeResponse {
  current_recipe: EafRecipe;
  optimized_recipe: EafRecipe;
  current_ttt: number;
  optimized_ttt: number;
  improvement_min: number;
  physics_compliant: boolean;
  best_score: number;
  comparison: OptimizationRow[];
  diagnostics: Record<string, unknown>;
}

export interface HistoricalVariable {
  variable: string;
  current: number;
  p5: number;
  median: number;
  p95: number;
  status: string;
}

export interface HistoricalResponse {
  variables: HistoricalVariable[];
  distribution: Record<string, number[]>;
}

export interface ProcessHealthItem {
  gauge: string;
  value: number;
  p5: number;
  median: number;
  p95: number;
  status: string;
  color: "green" | "yellow" | "red";
}

export interface ModelInfoResponse {
  model_name: string;
  optimizer_version: string;
  n_features: number;
  test_mae: number;
  test_r2: number;
  ci_half_width_95: number;
  dataset: string;
  features: string[];
  artifacts: Record<string, string>;
}

export const DEFAULT_RECIPE: EafRecipe = {
  HM: 56.8,
  DRI: 63.2,
  HBI: 0,
  Bucket: 0,
  LIME: 9.9,
  DOLO: 2.5,
  CPC: 576,
  POWER: 29985,
  OXY: 3911,
  Shift: "B",
  Power_Restriction: 0,
};

export const eafClient = axios.create({
  baseURL: EAF_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

export const eafApi = {
  health: () => eafClient.get<{ status: string; model_loaded: boolean }>("/health"),
  modelInfo: () => eafClient.get<ModelInfoResponse>("/model-info"),
  predict: (recipe: EafRecipe) => eafClient.post<PredictResponse>("/predict", recipe),
  optimize: (recipe: EafRecipe, n_generate = 1000) =>
    eafClient.post<OptimizeResponse>("/optimize", { ...recipe, n_generate }),
  whatif: (recipe: EafRecipe) => eafClient.post("/whatif", recipe),
  historical: (recipe: EafRecipe) => eafClient.post<HistoricalResponse>("/historical", recipe),
  processHealth: (recipe: EafRecipe) =>
    eafClient.post<{ items: ProcessHealthItem[] }>("/process-health", recipe),
  report: (recipe: EafRecipe, format: "json" | "csv" | "pdf") =>
    eafClient.post(
      "/report",
      { recipe, format, include_optimization: true },
      { responseType: format === "pdf" ? "blob" : "text" }
    ),
};
