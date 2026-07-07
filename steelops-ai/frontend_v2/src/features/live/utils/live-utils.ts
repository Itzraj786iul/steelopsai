import type { LiveHeatDetail, LiveHeatSummary, TimelineEvent } from "@/types/live.types";

export const FURNACE_STAGES = [
  { id: "arc", label: "Arc", statuses: ["CHARGING"] },
  { id: "melting", label: "Melting", statuses: ["MELTING"] },
  { id: "refining", label: "Refining", statuses: ["REFINING"] },
  { id: "slag", label: "Slag", statuses: ["REFINING"] },
  { id: "sampling", label: "Sampling", statuses: ["REFINING", "TAPPING"] },
  { id: "tapping", label: "Tapping", statuses: ["TAPPING"] },
] as const;

export const STATUS_FLOW = ["CHARGING", "MELTING", "REFINING", "TAPPING", "COMPLETED"] as const;

export const ALERT_LABELS: Record<string, string> = {
  PREDICTION_DRIFT: "Prediction Drift",
  STAGE_DELAY: "Stage Delay",
  HIGH_ENERGY: "High Energy",
  UNEXPECTED_POWER: "Unexpected Power",
  SAMPLING_DELAY: "Sampling Delay",
  F2_RISK: "Expected F2 risk",
  RECOMMENDATION_IGNORED: "Recommendation Ignored",
  TIMELINE_DELAY: "Timeline Delay",
  OPERATOR_DELAY: "Operator Delay",
  INVENTORY_ALERT: "Inventory Alert",
};

export function formatElapsed(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60;
}

export function normalizeLiveList(response: { items?: LiveHeatSummary[]; heats?: LiveHeatSummary[]; total?: number; active_count?: number }) {
  const items = response.items ?? response.heats ?? [];
  return {
    items,
    total: response.total ?? response.active_count ?? items.length,
  };
}

export function currentStageLabel(status: string): string {
  const match = FURNACE_STAGES.find((stage) => stage.statuses.includes(status as never));
  return match?.label ?? status;
}

export function stageProgress(status: string): number {
  const index = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  if (index === -1) return status === "COMPLETED" ? 100 : 10;
  return Math.round(((index + 1) / STATUS_FLOW.length) * 100);
}

export function nextStatus(status: string): string | null {
  const index = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  if (index === -1 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

export function deviationPct(predicted: number, actual: number): number {
  if (!predicted) return 0;
  return ((actual - predicted) / predicted) * 100;
}

export function buildComparisonRows(detail: LiveHeatDetail, predictedAtMin: number) {
  const actualAtMin = detail.elapsed_seconds / 60;
  const predictedPower = detail.metrics_history.power_kw?.at(-1)?.value ?? detail.power_kw ?? 0;
  const actualPower = detail.power_kw ?? predictedPower;

  return [
    { metric: "Heat Time", predicted: predictedAtMin, actual: actualAtMin, unit: "min" },
    { metric: "Power", predicted: predictedPower, actual: actualPower, unit: "kW" },
    { metric: "Energy", predicted: predictedPower * predictedAtMin / 60, actual: actualPower * actualAtMin / 60, unit: "MWh" },
    { metric: "Health", predicted: 85, actual: detail.health_score, unit: "score" },
    {
      metric: "Chemistry P",
      predicted: 0.028,
      actual: detail.chemistry.F1_P ?? 0,
      unit: "%",
    },
  ].map((row) => ({
    ...row,
    deviationPct: deviationPct(row.predicted, row.actual),
  }));
}

export function mapTimelineStages(events: TimelineEvent[], currentStatus: string) {
  const statusIndex = STATUS_FLOW.indexOf(currentStatus as (typeof STATUS_FLOW)[number]);
  const completedEvents = events.filter((e) => e.status === "COMPLETE" || e.status === "COMPLETED").length;

  return FURNACE_STAGES.map((stage, index) => {
    const isCurrent = stage.statuses.includes(currentStatus as never);
    const isComplete = isCurrent ? false : statusIndex > index || completedEvents > index;
    return {
      ...stage,
      state: isCurrent ? "current" : isComplete ? "complete" : "pending",
    } as const;
  });
}

export function chartSeries(history: Array<{ value: number; recorded_at: string }> | undefined, label: string) {
  return (history ?? []).map((point) => ({
    time: new Date(point.recorded_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    [label]: point.value,
  }));
}

export function isLiveHeatWorkspacePath(pathname: string): boolean {
  const match = pathname.match(/^\/live\/([^/]+)$/);
  if (!match) return false;
  return !["floor", "alerts"].includes(match[1]);
}
