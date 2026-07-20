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
  interpretation?: string;
  direction?: string;
}

export interface SimilarHeatItem {
  heat_id: string;
  shift: string;
  charge_t: number;
  actual_ttt?: number | null;
  predicted_ttt: number;
  ttt_difference?: number | null;
  similarity_pct: number;
  recipe_similarity_pct?: number | null;
  outcome_similarity_pct?: number | null;
  distance: number;
  rank?: number;
  recipe_deltas?: Partial<Record<keyof EafRecipe, number>>;
  truly_similar?: boolean;
  HM?: number | null;
  DRI?: number | null;
  HBI?: number | null;
  Bucket?: number | null;
  LIME?: number | null;
  DOLO?: number | null;
  CPC?: number | null;
  POWER?: number | null;
  OXY?: number | null;
  Power_Restriction?: number | null;
}

export interface NeighborTttBenchmark {
  n: number;
  mean_actual_ttt: number;
  median_actual_ttt: number;
  std_actual_ttt: number;
  min_actual_ttt: number;
  max_actual_ttt: number;
  best_similarity_pct?: number | null;
}

export interface IndustrialObservation {
  observation: string;
  severity: string;
}

export interface DigitalTwinLayer {
  score: number;
  status: string;
}

export interface DigitalTwinReadiness {
  layers: Record<string, DigitalTwinLayer>;
  overall_score: number;
  readiness_tier: string;
}

export interface PredictionExplainability {
  similar_heats: SimilarHeatItem[];
  neighbor_benchmark?: NeighborTttBenchmark | null;
  contributor_interpretations: ContributorItem[];
  prediction_quality: string;
  industrial_observations: IndustrialObservation[];
  digital_twin_readiness?: DigitalTwinReadiness;
  historical_similarity_pct?: number | null;
  industrial_risk?: string;
}

export interface ValidatedRecommendationRow extends OptimizationRow {
  historical_p5?: number;
  historical_median?: number;
  historical_p95?: number;
  historical_status?: string;
  severity?: string;
  risk_level?: string;
  industrial_acceptability?: string;
  absolute_change?: number;
  percent_change?: number;
  display_name?: string;
}

export interface Top5Alternative {
  rank: number;
  predicted_ttt: number;
  improvement_min: number;
  risk_level: string;
  confidence: string;
  similarity_pct: number;
  total_penalty: number;
  hm: number;
  dri: number;
  power: number;
  oxy: number;
}

export interface OptimizationExplainability {
  validated_recommendations: ValidatedRecommendationRow[];
  recommendation_confidence: string;
  recommendation_stability: string;
  top5_alternatives: Top5Alternative[];
  recommendation_narrative: string[];
  penalty_breakdown: Record<string, number>;
  similar_heats: SimilarHeatItem[];
  neighbor_benchmark?: NeighborTttBenchmark | null;
  industrial_observations: IndustrialObservation[];
  digital_twin_readiness?: DigitalTwinReadiness;
  diagnostics?: Record<string, unknown>;
}

export interface PredictionMetadata {
  model_version: string;
  pipeline: string;
  optimizer: string;
  prediction_timestamp: string;
  confidence: string;
  warnings: string[];
}

export interface PredictResponse {
  predicted_ttt: number;
  margin: number;
  ci_lower_95: number;
  ci_upper_95: number;
  ci_half_width?: number;
  neighbor_calibrated_ttt?: number;
  neighbor_ttt_band?: {
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    std?: number;
    n?: number;
  };
  top_contributors: ContributorItem[];
  operator_summary: Record<string, string>;
  validation_warnings: ValidationWarning[];
  confidence?: string;
  charge_classification?: string;
  metadata?: PredictionMetadata;
  explainability?: PredictionExplainability;
}

export interface HybridTrustResponse {
  heat_id: string;
  current_ttt: number;
  predicted_ttt: number;
  improvement_min: number;
  hybrid_score: number;
  score_breakdown: Record<string, number>;
  reliability_index: number;
  reliability_tier: string;
  physics_confidence: number;
  ai_confidence: number;
  industrial_confidence: number;
  historical_similarity_pct: number;
  recommendation_stability: number;
  agreement_pct: number;
  consensus: string;
  decision_tree: string[];
  scenarios: Record<string, unknown>[];
  digital_twin: Record<string, unknown>;
  recommended_recipe: EafRecipe;
  top5: Record<string, unknown>[];
  explanation: Record<string, unknown>;
}

export interface OptimizeV2Recommendation {
  rank: number;
  recipe: EafRecipe;
  predicted_ttt: number;
  improvement_min: number;
  confidence: string;
  historical_similarity_pct: number;
  stability: number;
  rules_satisfied: number;
  rules_violated: number;
  physics_feasible: boolean;
  physics_violations: string[];
  objective_breakdown: Record<string, unknown>;
  explanation: RecommendationExplanation;
  industrial_score: number;
  physics_score: number;
}

export interface OptimizeV2Response {
  current_recipe: EafRecipe;
  current_ttt: number;
  optimized_recipe: EafRecipe;
  optimized_ttt: number;
  improvement_min: number;
  physics_compliant: boolean;
  power_optimized: boolean;
  recommendations: OptimizeV2Recommendation[];
  diagnostics: Record<string, unknown>;
}

export interface RecommendationExplanation {
  narrative?: string;
  narrative_lines?: string[];
  expected_saving_min?: number;
  confidence?: string;
  historical_support?: string[];
  literature_support?: string[];
  rule_trace?: string[];
  rules_satisfied?: number;
  rules_violated?: number;
}

export interface ValidationEntry {
  heat_number: string;
  predicted_ttt: number;
  actual_ttt?: number | string | null;
  optimizer_used: string;
  recommendation_applied: boolean | string;
  operator_comments?: string;
  recorded_at?: string;
  difference?: number | null;
}

export interface ValidationListResponse {
  entries: ValidationEntry[];
  metrics: {
    count: number;
    mae?: number | null;
    rmse?: number | null;
    bias?: number | null;
    mape?: number | null;
  };
}

export interface OperatorFeedbackEntry {
  heat_number?: string;
  optimizer_used?: string;
  status: "Accepted" | "Modified" | "Rejected";
  comment?: string;
  constraint_issue?: string;
  maintenance_issue?: string;
  impractical_reason?: string;
  recorded_at?: string;
}

export interface ReliabilitySummary {
  avg_reliability_index: number | null;
  avg_ai_confidence: number | null;
  avg_physics_confidence: number | null;
  avg_industrial_confidence: number | null;
  avg_historical_similarity: number | null;
  recommendation_acceptance_rate_pct: number | null;
  optimizer_success_rate_pct: number | null;
  validation_metrics: ValidationListResponse["metrics"];
  prediction_error_trend: { heat_number?: string; recorded_at?: string; error_min: number; signed_error_min: number }[];
}

export interface ReadinessIndicator {
  area: string;
  status: "green" | "yellow" | "red";
  score: number | null;
  summary: string;
  recommendations: string[];
}

export interface DeploymentReadiness {
  overall_status: "green" | "yellow" | "red";
  overall_score: number;
  indicators: ReadinessIndicator[];
  generated_at: string;
}

export interface OptimizationRow {
  variable: string;
  display_name?: string;
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
  explainability?: OptimizationExplainability;
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
  // ML optimize/hybrid can be slow; auth overrides with a shorter timeout.
  timeout: 60_000,
});

/** Dedicated short-timeout client for login/refresh — must not wait on ML. */
export const eafAuthClient = axios.create({
  baseURL: EAF_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 12_000,
});

eafClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

eafAuthClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const eafApi = {
  health: () => eafClient.get<{ status: string; model_loaded: boolean }>("/health"),
  modelInfo: () => eafClient.get<ModelInfoResponse>("/model-info"),
  predict: (recipe: EafRecipe) => eafClient.post<PredictResponse>("/predict", recipe),
  optimize: (recipe: EafRecipe, n_generate = 1000) =>
    eafClient.post<OptimizeResponse>("/optimize", { ...recipe, n_generate }),
  optimizeV2: (recipe: EafRecipe) => eafClient.post<OptimizeV2Response>("/optimize/v2", recipe),
  hybridEvaluate: (recipe: EafRecipe, heat_id = "") =>
    eafClient.post<HybridTrustResponse>("/hybrid/evaluate", { ...recipe, heat_id }),
  whatif: (recipe: EafRecipe) => eafClient.post("/whatif", recipe),
  historical: (recipe: EafRecipe) => eafClient.post<HistoricalResponse>("/historical", recipe),
  processHealth: (recipe: EafRecipe) =>
    eafClient.post<{ items: ProcessHealthItem[] }>("/process-health", recipe),
  validationList: () => eafClient.get<ValidationListResponse>("/validation"),
  validationCreate: (entry: Omit<ValidationEntry, "recorded_at" | "difference">) =>
    eafClient.post<ValidationEntry>("/validation", entry),
  feedbackList: () => eafClient.get<OperatorFeedbackEntry[]>("/feedback"),
  feedbackCreate: (entry: OperatorFeedbackEntry) => eafClient.post<OperatorFeedbackEntry>("/feedback", entry),
  feedbackSummary: () =>
    eafClient.get<{ total: number; accepted: number; modified: number; rejected: number; acceptance_rate_pct: number | null }>(
      "/feedback/summary"
    ),
  reliabilitySummary: () => eafClient.get<ReliabilitySummary>("/reliability/summary"),
  deploymentReadiness: () => eafClient.get<DeploymentReadiness>("/deployment/readiness"),
  report: (recipe: EafRecipe, format: "json" | "csv" | "pdf") =>
    eafClient.post(
      "/report",
      { recipe, format, include_optimization: true },
      { responseType: format === "pdf" ? "blob" : "text" }
    ),

  // ── Heat History (production database) ──────────────────────────────
  heatsList: (params?: Record<string, string | number | undefined>) =>
    eafClient.get<HeatListResponse>("/heats", { params }),
  heatGet: (id: string) => eafClient.get<HeatRecord>("/heats/" + encodeURIComponent(id)),
  heatGetByNumber: (heatNumber: string) =>
    eafClient.get<HeatRecord>("/heats/by-number/" + encodeURIComponent(heatNumber)),
  heatFromPrediction: (body: {
    heat_number?: string;
    session_id?: string;
    heat_record_id?: string;
    operator_name?: string;
    operator_id?: string;
    furnace_id?: string;
    plant?: string;
    supervisor_id?: string;
    predicted_by?: string;
    recipe_inputs: EafRecipe | Record<string, unknown>;
    prediction: PredictResponse | Record<string, unknown>;
    hybrid?: HybridTrustResponse | Record<string, unknown> | null;
  }) => eafClient.post<HeatRecord>("/heats/from-prediction", body),
  heatFromOptimizer: (body: {
    heat_number?: string;
    session_id?: string;
    heat_record_id?: string;
    recipe_inputs?: EafRecipe | Record<string, unknown>;
    optimizer?: OptimizeResponse | Record<string, unknown> | null;
    optimizer_v2?: OptimizeV2Response | Record<string, unknown> | null;
    recommendation_status?: "Accepted" | "Modified" | "Rejected" | null;
    optimized_by?: string;
    approved_by?: string;
  }) => eafClient.post<HeatRecord>("/heats/from-optimizer", body),
  heatFromValidation: (body: {
    heat_number?: string;
    session_id?: string;
    heat_record_id?: string;
    predicted_ttt?: number;
    actual_ttt?: number | string | null;
    operator_comments?: string;
    recommendation_status?: "Accepted" | "Modified" | "Rejected" | null;
    actual_recipe?: Record<string, unknown> | null;
    mark_completed?: boolean;
    validated_by?: string;
    furnace_id?: string;
    supervisor_id?: string;
    plant?: string;
  }) => eafClient.post<HeatRecord>("/heats/from-validation", body),
  heatSetStatus: (id: string, status: HeatLifecycleStatus) =>
    eafClient.patch<HeatRecord>(`/heats/${encodeURIComponent(id)}/status`, { status }),
  heatArchive: (id: string) => eafClient.post<HeatRecord>(`/heats/${encodeURIComponent(id)}/archive`),
  heatDelete: (id: string) =>
    eafClient.delete<{ deleted: boolean; id: string }>(`/heats/${encodeURIComponent(id)}`),
  heatsBulkDelete: (ids: string[]) =>
    eafClient.post<{ deleted: number; requested: number }>("/heats/bulk-delete", { ids }),
  heatsDashboard: (params?: { period?: string; date_from?: string; date_to?: string }) =>
    eafClient.get<HeatDashboardResponse>("/heats/dashboard", { params }),
  heatsAnalytics: (params?: { period?: string; date_from?: string; date_to?: string }) =>
    eafClient.get("/heats/analytics", { params }),
  heatsDailyReport: (day?: string) => eafClient.get("/heats/reports/daily", { params: { day } }),
  heatsWeeklyReport: (anchor?: string) => eafClient.get("/heats/reports/weekly", { params: { anchor } }),
  heatsMonthlyReport: (anchor?: string) => eafClient.get("/heats/reports/monthly", { params: { anchor } }),
  heatsValidationMetrics: () =>
    eafClient.get<ValidationListResponse["metrics"]>("/heats/validation-metrics"),
  heatsExport: (body: {
    format: "csv" | "json" | "excel" | "pdf";
    ids?: string[];
    q?: string;
    shift?: string;
    status?: string;
    period?: string;
    date_from?: string;
    date_to?: string;
  }) =>
    eafClient.post("/heats/export", body, {
      responseType: body.format === "json" ? "text" : "blob",
    }),
};

export type HeatLifecycleStatus =
  | "Draft"
  | "Predicted"
  | "Optimized"
  | "Accepted"
  | "Running"
  | "Completed"
  | "Validated"
  | "Archived";

export interface HeatRecord {
  id: string;
  heat_number: string;
  date: string;
  time: string;
  shift: string;
  status: HeatLifecycleStatus | string;
  operator_name?: string;
  operator_id?: string;
  recipe_inputs?: EafRecipe | Record<string, unknown> | null;
  HM?: number | null;
  DRI?: number | null;
  HBI?: number | null;
  Bucket?: number | null;
  LIME?: number | null;
  DOLO?: number | null;
  CPC?: number | null;
  OXY?: number | null;
  Electrical_Energy_kWh?: number | null;
  Target_Oxygen_Program?: number | null;
  Target_Carbon_Program?: number | null;
  Power_Restriction?: number | null;
  predicted_ttt?: number | null;
  prediction_interval_low?: number | null;
  prediction_interval_high?: number | null;
  confidence?: string | null;
  historical_similarity?: number | null;
  risk_level?: string | null;
  optimized_recipe?: EafRecipe | Record<string, unknown> | null;
  optimized_ttt?: number | null;
  expected_saving?: number | null;
  v2_recipe?: EafRecipe | Record<string, unknown> | null;
  v2_ttt?: number | null;
  v2_saving?: number | null;
  reliability_index?: number | null;
  physics_confidence?: number | null;
  industrial_confidence?: number | null;
  ai_confidence?: number | null;
  consensus?: string | null;
  actual_ttt?: number | null;
  prediction_error?: number | null;
  optimizer_result?: OptimizeResponse | Record<string, unknown> | null;
  actual_recipe?: Record<string, unknown> | null;
  recommendation_status?: "Accepted" | "Modified" | "Rejected" | string | null;
  operator_comments?: string | null;
  explainability?: PredictionExplainability | Record<string, unknown> | null;
  session_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface HeatListResponse {
  items: HeatRecord[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface HeatDashboardResponse {
  period: { from?: string | null; to?: string | null };
  cards: {
    total_heats: number;
    completed: number;
    pending_validation: number;
    average_ttt?: number | null;
    average_error?: number | null;
    average_saving?: number | null;
    acceptance_rate?: number | null;
    reliability?: number | null;
    prediction_confidence?: string | null;
    optimization_success?: number | null;
    validation_rate?: number | null;
  };
  pie: {
    shift_distribution: { name: string; value: number }[];
    recommendation_acceptance: { name: string; value: number }[];
    confidence_distribution: { name: string; value: number }[];
  };
  trends: {
    ttt_vs_heat: { heat_number?: string; predicted_ttt?: number; actual_ttt?: number | null }[];
    saving_vs_heat: { heat_number?: string; expected_saving?: number | null }[];
    error_vs_heat: { heat_number?: string; prediction_error?: number | null }[];
  };
}
