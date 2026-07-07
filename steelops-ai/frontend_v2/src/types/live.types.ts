export interface ChemistrySnapshot {
  F1_P?: number | null;
  F1_C?: number | null;
  F1_SI?: number | null;
  F1_S?: number | null;
  F1_MN?: number | null;
  zone_p?: string | null;
  zone_c?: string | null;
}

export interface RecipeSnapshot {
  HM?: number | null;
  DRI?: number | null;
  LIME?: number | null;
  DOLO?: number | null;
  CPC?: number | null;
  T_C?: number | null;
  Bucket?: number | null;
}

export interface PredictionSnapshot {
  f2_probability?: number | null;
  f2_risk_band?: string | null;
  at_predicted_min?: number | null;
  at_category?: string | null;
  model_version?: string;
}

export interface MetricPoint {
  value: number;
  recorded_at: string;
}

export interface LiveHeatSummary {
  id: string;
  heat_number: string;
  status: string;
  shift?: string | null;
  operator_name?: string | null;
  elapsed_seconds?: number;
  health_score?: number | null;
  playbook_compliance_pct?: number | null;
  alert_count?: number;
  f2_risk_band?: string | null;
  progress_pct?: number;
  stage?: string;
  elapsed_min?: number;
}

export interface LiveAlertItem {
  id: string;
  severity: string;
  trigger_code: string;
  message: string;
  recommendation?: string | null;
  status: string;
  escalation_level: number;
  created_at: string;
  acknowledged_at?: string | null;
}

export interface LiveRecommendationItem {
  id: string;
  priority: number;
  action_text: string;
  reason?: string | null;
  expected_benefit?: string | null;
  confidence?: number | null;
  estimated_savings_rs?: number | null;
  impact: string;
  status: string;
}

export interface LiveHeatDetail {
  id: string;
  heat_number: string;
  status: string;
  shift?: string | null;
  operator_id?: string | null;
  operator_name?: string | null;
  started_at: string;
  elapsed_seconds: number;
  recipe: RecipeSnapshot;
  chemistry: ChemistrySnapshot;
  health_score: number;
  health_band: string;
  health_trend: number[];
  playbook_compliance_pct: number;
  playbook_violations: string[];
  prediction: PredictionSnapshot;
  prediction_status: string;
  power_kw?: number | null;
  oxygen_nm3?: number | null;
  sample_count: number;
  alerts: LiveAlertItem[];
  recommendations: LiveRecommendationItem[];
  metrics_history: Record<string, MetricPoint[]>;
}

export interface LiveHeatListResponse {
  items: LiveHeatSummary[];
  total: number;
  updated_at: string;
  heats?: LiveHeatSummary[];
  active_count?: number;
}

export interface TimelineEvent {
  id: string;
  phase: string;
  label: string;
  description?: string | null;
  status: string;
  occurred_at?: string | null;
  sort_order: number;
}

export interface TimelineResponse {
  heat_id: string;
  events: TimelineEvent[];
}

export interface OperatorActionResponse {
  id: string;
  action_type: string;
  response: string;
  comment?: string | null;
  created_at: string;
}

export interface WsMessage {
  type: string;
  payload?: unknown;
  timestamp?: string;
}

export interface PlantOverview {
  tenant_name?: string;
  active_furnaces?: number;
  active_heats: LiveHeatSummary[];
  production_today?: number;
  avg_at_min?: number;
  f2_rate_pct?: number;
  total_power_mwh?: number;
  total_oxygen_nm3?: number;
  efficiency_pct?: number;
  alarm_count?: number;
  updated_at?: string;
  planned_heats?: number;
  shift?: string;
  green_rate_pct?: number;
  alerts_count?: number;
}

export interface ExecutionSummary {
  predictedAtMin: number;
  actualAtMin: number;
  differenceMin: number;
  minutesSaved: number;
  recipeUsed: RecipeSnapshot;
  recommendationFollowed: boolean;
  learningSummary: string;
  confidenceUpdate: string;
  businessValueInr: number;
}
