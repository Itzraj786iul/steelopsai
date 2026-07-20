/**
 * Domain-friendly KPI labels — prefer over raw API keys / humanizeKey alone.
 */

const KPI_LABELS: Record<string, string> = {
  total_heats: "Total heats",
  totalHeats: "Total heats",
  predicted_ttt: "Predicted cycle time",
  predictedTtt: "Predicted cycle time",
  actual_ttt: "Actual cycle time",
  actualTtt: "Actual cycle time",
  avg_ttt: "Avg cycle time",
  avgTtt: "Avg cycle time",
  mae: "Avg error (min)",
  mape: "Avg error %",
  running_heats: "Running now",
  runningHeats: "Running now",
  live_queue: "Live queue",
  liveQueue: "Live queue",
  waiting_validation: "Waiting validation",
  WaitingValidation: "Waiting validation",
  completed_today: "Completed today",
  completedToday: "Completed today",
  delayed: "Delayed",
  on_time: "On time",
  onTime: "On time",
  acceptance_rate: "Acceptance rate",
  acceptanceRate: "Acceptance rate",
  active_users: "Active users",
  activeUsers: "Active users",
  open_alerts: "Open alerts",
  openAlerts: "Open alerts",
  open_tasks: "Open tasks",
  openTasks: "Open tasks",
  furnaces_online: "Furnaces online",
  furnacesOnline: "Furnaces online",
  shift_heats: "Shift heats",
  shiftHeats: "Shift heats",
  confidence: "Confidence",
  risk: "Risk",
  charge: "Total charge",
  improvement_min: "Minutes saved",
  improvementMin: "Minutes saved",
  prediction_error: "Prediction error",
  predictionError: "Prediction error",
  reliability_index: "Reliability",
  reliabilityIndex: "Reliability",
};

/** Map API / store keys to operator-friendly KPI labels. */
export function kpiLabel(key: string): string {
  if (KPI_LABELS[key]) return KPI_LABELS[key];
  const snake = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  if (KPI_LABELS[snake]) return KPI_LABELS[snake];
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
