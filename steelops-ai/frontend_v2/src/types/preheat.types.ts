export interface PreheatIntelligenceRequest {
  HM: number;
  DRI: number;
  CPC: number;
  LIME: number;
  DOLO: number;
  HBI?: number;
  T_C?: number;
  charge_temperature?: number;
  Bucket?: number;
  Shift?: string;
  Grade?: string;
  planned_start_time?: string;
  heat_id?: string;
}

export interface AlternativeRecipe {
  portfolio_slot?: string;
  portfolio_label?: string;
  candidate_id?: string;
  recipe_HM?: number;
  recipe_DRI?: number;
  recipe_CPC?: number;
  recipe_LIME?: number;
  recipe_DOLO?: number;
  recipe_HBI?: number;
  recipe_T_C?: number;
  predicted_heat_time_min?: number;
  expected_at_reduction_min?: number;
  expected_GREEN_pct?: number;
  expected_POWER?: number;
  expected_OXY?: number;
  confidence?: string;
  confidence_score?: number;
  approvals_required?: string;
  warnings?: string | null;
  fallback_recommendation?: string;
  why_generated?: string;
  copilot_ready?: string;
  [key: string]: unknown;
}

export interface DigitalTwinComparison {
  comparison_id?: string;
  baseline_virtual_heat_id?: string;
  optimized_virtual_heat_id?: string;
  baseline_recipe_id?: string;
  optimized_recipe_id?: string;
  baseline_heat_time_min?: number;
  optimized_heat_time_min?: number;
  heat_time_improvement_min?: number;
  baseline_POWER_kWh?: number;
  optimized_POWER_kWh?: number;
  power_savings_kWh?: number;
  baseline_GREEN_pct?: number;
  optimized_GREEN_pct?: number;
  GREEN_improvement_pp?: number;
  baseline_confidence?: string;
  optimized_confidence?: string;
  baseline_dominant_stage?: string;
  optimized_dominant_stage?: string;
  recommendation?: string;
  stage_explanation?: string;
  [key: string]: unknown;
}

export interface LearningReference {
  lesson_id?: string;
  lesson_type?: string;
  description?: string;
  support_heats?: number;
  avg_realised_improvement_min?: number;
  confidence?: string;
  action?: string;
  [key: string]: unknown;
}

export interface EngineTraceStep {
  engine_id: string;
  engine_name: string;
  duration_ms: number;
  status: string;
  message?: string;
}

export interface TapToTapPredictionInterval {
  p10?: number | null;
  p50: number;
  p90?: number | null;
  low_90?: number | null;
  high_90?: number | null;
  low_95?: number | null;
  high_95?: number | null;
}

export interface TapToTapTopDriver {
  feature: string;
  label: string;
  direction: string;
  impact_rank?: number;
}

export interface TapToTapPrediction {
  predicted_ttt: number;
  prediction_interval: TapToTapPredictionInterval;
  confidence: number;
  model_version: string;
  latency_ms: number;
  feature_vector?: Record<string, unknown>;
  warnings?: string[];
  top_drivers: TapToTapTopDriver[];
  prediction_quality: string;
  model_algorithm?: string;
  estimated_completion_minutes?: number | null;
}

export interface PreheatDecisionPackage {
  package_id: string;
  generated_at: string;
  planned_recipe: Record<string, number>;
  predicted_heat_time_min: number;
  target_heat_time_min: number;
  minutes_to_save: number;
  recommended_optimized_recipe: Record<string, number>;
  alternative_recipes: AlternativeRecipe[];
  digital_twin_comparison: DigitalTwinComparison;
  expected_AT: number;
  expected_POWER: number;
  expected_OXY: number;
  expected_GREEN_probability_pct: number;
  confidence_score: number;
  confidence_tier: string;
  engineering_reasoning: string;
  root_cause: string;
  operator_actions: string[];
  approval_requirements: string;
  business_value_inr: number;
  learning_references: LearningReference[];
  engine_trace: EngineTraceStep[];
  total_execution_time_ms: number;
  shift: string;
  grade: string;
  planned_start_time: string;
  copilot_ready: boolean;
  validation_errors: string[];
  model_version?: string;
  prediction_interval?: Record<string, { low: number; high: number }>;
  confidence?: number;
  shap_summary?: Array<{ feature: string; mean_abs_shap?: number }>;
  top_positive_features?: Array<{ feature: string; impact_min?: number }>;
  top_negative_features?: Array<{ feature: string; impact_min?: number }>;
  uncertainty?: number;
  prediction_quality?: string;
  estimation_method?: string;
  tap_to_tap_prediction?: TapToTapPrediction | null;
}

export type RecipeRecord = Record<string, number | string>;

export interface RecipeComparisonItem {
  label?: string;
  recipe: RecipeRecord;
  f2_probability?: number;
  at_predicted_min?: number;
  power_kw?: number;
  health_score?: number;
  estimated_savings_rs?: number;
  green_probability?: number;
  playbook_compliance_pct?: number;
}

export interface RecipeCompareResponse {
  comparisons: RecipeComparisonItem[];
  best_by_health: RecipeComparisonItem | null;
  best_by_savings: RecipeComparisonItem | null;
}

export interface ScheduleItem {
  id: string;
  sequence_order: number;
  heat_number: string | null;
  furnace_name: string | null;
  operator_name: string | null;
  ladle_name: string | null;
  shift: string;
  planned_start: string | null;
  planned_end: string | null;
  status: string;
  estimated_power_mw: number;
}

export interface SchedulingResponse {
  schedule: ScheduleItem[];
  idle_time_min: number;
  queue_length: number;
  estimated_delay_min: number;
}

export interface DashboardHeatRow {
  id: string;
  heatNumber: string;
  shift: string;
  operator: string;
  status: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  plannedStart: string | null;
  predictedAt: number | null;
  minutesToSave: number | null;
  aiReadiness: "READY" | "PENDING" | "ANALYZING";
  grade: string;
  recipe: Record<string, unknown>;
}
