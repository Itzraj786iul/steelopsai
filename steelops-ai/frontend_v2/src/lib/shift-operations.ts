import type { HeatSessionSnapshot, RecommendationAcceptanceStatus } from "@/stores/current-heat-store";
import { currentCharge } from "@/stores/current-heat-store";
import { deriveCurrentLifecycleStage } from "@/lib/heat-lifecycle";
import { computeSessionMae } from "@/lib/validation-metrics";

export type HeatQueueStatus = "predicted" | "optimized" | "waiting_validation" | "archived";

export type AlertSeverity = "info" | "warning" | "critical";

export interface PlantAlert {
  id: string;
  heatId: string;
  heatNumber: string;
  title: string;
  message: string;
  severity: AlertSeverity;
}

export interface OperatorActivityEntry {
  id: string;
  heatId: string;
  heatNumber: string;
  action: "prediction" | "optimization" | "report" | "accepted" | "rejected" | "modified" | "validated";
  timestamp: string;
}

export interface LifecycleTimestamps {
  recipeEntered?: string;
  prediction?: string;
  optimization?: string;
  hybrid?: string;
  operatorReview?: string;
  chargingStarted?: string;
  tapped?: string;
  validation?: string;
  archived?: string;
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function confidenceToScore(confidence: string | null | undefined): number | null {
  if (!confidence) return null;
  const lower = confidence.toLowerCase();
  if (lower.includes("high")) return 3;
  if (lower.includes("medium") || lower.includes("moderate")) return 2;
  if (lower.includes("low")) return 1;
  return null;
}

function confidenceLabel(score: number | null): string {
  if (score == null) return "—";
  if (score >= 2.5) return "High";
  if (score >= 1.5) return "Medium";
  return "Low";
}

function parseActualTtt(value: string | undefined): number | null {
  if (!value || value === "Pending") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function getTodayHeats(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[]
): HeatSessionSnapshot[] {
  const todayHistory = sessionHistory.filter((h) => isToday(h.lastUpdated));
  if (active && isToday(active.lastUpdated)) {
    return [active, ...todayHistory.filter((h) => h.id !== active.id)];
  }
  return todayHistory;
}

export function getAllHeats(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[]
): HeatSessionSnapshot[] {
  if (active) {
    return [active, ...sessionHistory.filter((h) => h.id !== active.id)];
  }
  return sessionHistory;
}

export function deriveHeatQueueStatus(heat: HeatSessionSnapshot, isActive: boolean): HeatQueueStatus {
  if (heat.archived && !isActive) return "archived";
  if (heat.validation?.validatedAt) return "archived";
  const hasActual = parseActualTtt(heat.validation?.actualTtt) != null;
  if (heat.optimizer && !hasActual && !heat.validation?.validatedAt) return "waiting_validation";
  if (heat.optimizer) return "optimized";
  if (heat.prediction) return "predicted";
  return "predicted";
}

export function heatSimilarity(heat: HeatSessionSnapshot): number | null {
  return (
    heat.prediction?.explainability?.historical_similarity_pct ??
    heat.prediction?.explainability?.similar_heats?.[0]?.similarity_pct ??
    null
  );
}

export interface TodayProductionStats {
  totalHeats: number;
  running: number;
  completed: number;
  optimized: number;
  validated: number;
  avgPredictedTtt: number | null;
  avgExpectedSaving: number | null;
  avgConfidenceScore: number | null;
  avgConfidenceLabel: string;
  avgReliability: number | null;
  avgCharge: number | null;
  avgElectricalEnergy: number | null;
  avgOxygen: number | null;
  avgDri: number | null;
  currentShift: string;
  bestHeat: HeatSessionSnapshot | null;
  worstHeat: HeatSessionSnapshot | null;
}

export function computeTodayProduction(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[],
  currentShift: string
): TodayProductionStats {
  const today = getTodayHeats(active, sessionHistory);
  const activeId = active?.id;

  const predictions = today.map((h) => h.prediction?.predicted_ttt).filter((v): v is number => v != null);
  const savings = today.map((h) => h.optimizer?.improvement_min).filter((v): v is number => v != null);
  const reliabilities = today.map((h) => h.hybrid?.reliability_index).filter((v): v is number => v != null);
  const confidenceScores = today.map((h) => confidenceToScore(h.confidence)).filter((v): v is number => v != null);
  const charges = today.map((h) => currentCharge(h.recipe));
  const powers = today.map((h) => h.recipe.POWER);
  const oxygens = today.map((h) => h.recipe.OXY);
  const dris = today.map((h) => h.recipe.DRI);

  const running = today.filter((h) => h.id === activeId && !h.archived).length;
  const completed = today.filter((h) => h.archived || !!h.validation?.validatedAt).length;
  const optimized = today.filter((h) => !!h.optimizer).length;
  const validated = today.filter((h) => !!h.validation?.validatedAt || parseActualTtt(h.validation?.actualTtt) != null).length;

  let bestHeat: HeatSessionSnapshot | null = null;
  let worstHeat: HeatSessionSnapshot | null = null;
  if (savings.length) {
    bestHeat = today.reduce((best, h) => {
      const s = h.optimizer?.improvement_min ?? -Infinity;
      const bestS = best.optimizer?.improvement_min ?? -Infinity;
      return s > bestS ? h : best;
    }, today[0]);
    worstHeat = today.reduce((worst, h) => {
      const s = h.optimizer?.improvement_min ?? Infinity;
      const worstS = worst.optimizer?.improvement_min ?? Infinity;
      return s < worstS ? h : worst;
    }, today[0]);
  }

  const avgConf = avg(confidenceScores);

  return {
    totalHeats: today.length,
    running,
    completed,
    optimized,
    validated,
    avgPredictedTtt: avg(predictions),
    avgExpectedSaving: avg(savings),
    avgConfidenceScore: avgConf,
    avgConfidenceLabel: confidenceLabel(avgConf),
    avgReliability: avg(reliabilities),
    avgCharge: avg(charges),
    avgElectricalEnergy: avg(powers),
    avgOxygen: avg(oxygens),
    avgDri: avg(dris),
    currentShift,
    bestHeat,
    worstHeat,
  };
}

export interface ShiftPerformanceStats {
  shift: string;
  totalHeats: number;
  avgTtt: number | null;
  avgSaving: number | null;
  avgConfidenceLabel: string;
  avgReliability: number | null;
  acceptedRecommendations: number;
  rejectedRecommendations: number;
  modifiedRecommendations: number;
  sessionMae: number | null;
}

export function computeShiftPerformance(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[],
  shift: string
): ShiftPerformanceStats {
  const today = getTodayHeats(active, sessionHistory).filter((h) => h.shift === shift);
  const predictions = today.map((h) => h.prediction?.predicted_ttt).filter((v): v is number => v != null);
  const savings = today.map((h) => h.optimizer?.improvement_min).filter((v): v is number => v != null);
  const reliabilities = today.map((h) => h.hybrid?.reliability_index).filter((v): v is number => v != null);
  const confScores = today.map((h) => confidenceToScore(h.confidence)).filter((v): v is number => v != null);

  return {
    shift,
    totalHeats: today.length,
    avgTtt: avg(predictions),
    avgSaving: avg(savings),
    avgConfidenceLabel: confidenceLabel(avg(confScores)),
    avgReliability: avg(reliabilities),
    acceptedRecommendations: today.filter((h) => h.recommendationAcceptance === "Accepted").length,
    rejectedRecommendations: today.filter((h) => h.recommendationAcceptance === "Rejected").length,
    modifiedRecommendations: today.filter((h) => h.recommendationAcceptance === "Modified").length,
    sessionMae: computeSessionMae(active, sessionHistory),
  };
}

export interface ExecutiveKpis {
  plantAvailability: number | null;
  predictionAccuracy: number | null;
  optimizerAcceptance: number | null;
  modelReliability: number | null;
  averageSaving: number | null;
  digitalTwinReadiness: number | null;
}

export function computeExecutiveKpis(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[]
): ExecutiveKpis {
  const today = getTodayHeats(active, sessionHistory);
  const withPrediction = today.filter((h) => h.prediction);
  const validated = today.filter((h) => parseActualTtt(h.validation?.actualTtt) != null);
  const savings = today.map((h) => h.optimizer?.improvement_min).filter((v): v is number => v != null);
  const reliabilities = today.map((h) => h.hybrid?.reliability_index).filter((v): v is number => v != null);

  const acceptanceTotal = today.filter((h) => h.recommendationAcceptance).length;
  const accepted = today.filter((h) => h.recommendationAcceptance === "Accepted").length;

  const mae = computeSessionMae(active, sessionHistory);
  const accuracy = mae != null ? Math.max(0, 100 - mae * 5) : validated.length ? 92 : null;

  const dtScores = today
    .map((h) => h.prediction?.explainability?.digital_twin_readiness?.overall_score)
    .filter((v): v is number => v != null);
  const activeDt = active?.prediction?.explainability?.digital_twin_readiness?.overall_score ?? null;

  return {
    plantAvailability: today.length ? (withPrediction.length / today.length) * 100 : null,
    predictionAccuracy: accuracy,
    optimizerAcceptance: acceptanceTotal ? (accepted / acceptanceTotal) * 100 : null,
    modelReliability: avg(reliabilities),
    averageSaving: avg(savings),
    digitalTwinReadiness: avg(dtScores) ?? activeDt,
  };
}

export function generatePlantAlerts(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[]
): PlantAlert[] {
  const alerts: PlantAlert[] = [];
  const heats = getTodayHeats(active, sessionHistory);

  for (const heat of heats) {
    const id = heat.id;
    const num = heat.heatNumber || "—";

    if (heat.confidence?.toLowerCase().includes("low")) {
      alerts.push({
        id: `${id}-low-conf`,
        heatId: id,
        heatNumber: num,
        title: "Low Confidence",
        message: `Heat ${num} prediction confidence is ${heat.confidence}.`,
        severity: "warning",
      });
    }

    const sim = heatSimilarity(heat);
    if (sim != null && sim < 60) {
      alerts.push({
        id: `${id}-low-sim`,
        heatId: id,
        heatNumber: num,
        title: "Low Similarity",
        message: `Heat ${num} historical similarity is ${sim.toFixed(0)}%.`,
        severity: "warning",
      });
    }

    if (heat.warnings.length) {
      alerts.push({
        id: `${id}-outlier`,
        heatId: id,
        heatNumber: num,
        title: "Historical Outlier",
        message: heat.warnings[0],
        severity: "warning",
      });
    }

    const charge = currentCharge(heat.recipe);
    if (charge < 100 || charge > 160) {
      alerts.push({
        id: `${id}-charge`,
        heatId: id,
        heatNumber: num,
        title: "Charge Outside Historical Band",
        message: `Heat ${num} charge ${charge.toFixed(1)} t is outside typical operating range.`,
        severity: "critical",
      });
    }

    if (heat.recommendationAcceptance === "Rejected") {
      alerts.push({
        id: `${id}-rejected`,
        heatId: id,
        heatNumber: num,
        title: "Recommendation Rejected",
        message: `Operator rejected optimizer recommendation for heat ${num}.`,
        severity: "info",
      });
    }

    if (heat.optimizer && !heat.validation?.validatedAt && parseActualTtt(heat.validation?.actualTtt) == null) {
      alerts.push({
        id: `${id}-val-pending`,
        heatId: id,
        heatNumber: num,
        title: "Validation Pending",
        message: `Heat ${num} awaiting actual TTT entry.`,
        severity: "info",
      });
    }
  }

  return alerts.slice(0, 12);
}

export interface FurnaceTimelineEvent {
  time: string;
  label: string;
  status: "completed" | "current" | "pending";
}

export function buildFurnaceTimeline(heat: HeatSessionSnapshot | null): FurnaceTimelineEvent[] {
  if (!heat) return [];

  const ts = heat.lifecycleTimestamps ?? {};
  const base = ts.recipeEntered ?? heat.lastUpdated ?? new Date().toISOString();
  const baseDate = new Date(base);

  const addMinutes = (mins: number) => {
    const d = new Date(baseDate);
    d.setMinutes(d.getMinutes() + mins);
    return d.toISOString();
  };

  const formatTime = (iso: string | undefined, fallbackMins?: number) => {
    const t = iso ?? (fallbackMins != null ? addMinutes(fallbackMins) : undefined);
    if (!t) return "—";
    return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const currentStage = deriveCurrentLifecycleStage(heat);

  const events: { key: string; label: string; iso?: string; fallbackMins?: number; stageId: string }[] = [
    { key: "recipe", label: "Recipe Entered", iso: ts.recipeEntered, fallbackMins: 0, stageId: "recipe_entered" },
    { key: "pred", label: "Prediction", iso: ts.prediction, fallbackMins: 1, stageId: "prediction_complete" },
    { key: "opt", label: "Optimization", iso: ts.optimization, fallbackMins: 2, stageId: "optimization_complete" },
    {
      key: "review",
      label: heat.recommendationAcceptance ? `Operator ${heat.recommendationAcceptance}` : "Operator Review",
      iso: ts.operatorReview,
      fallbackMins: 4,
      stageId: "operator_review",
    },
    { key: "charge", label: "Charging Started", iso: ts.chargingStarted, fallbackMins: 5, stageId: "actual_ttt" },
    { key: "tap", label: "Tapped", iso: ts.tapped, fallbackMins: heat.prediction ? Math.round(heat.prediction.predicted_ttt) : 30, stageId: "actual_ttt" },
    {
      key: "val",
      label: heat.validation?.validatedAt ? "Validation Complete" : "Validation Pending",
      iso: ts.validation,
      stageId: "validation",
    },
  ];

  return events.map((e) => {
    const stageIndex = ["recipe_entered", "prediction_complete", "optimization_complete", "hybrid_evaluation", "operator_review", "actual_ttt", "validation", "archived"].indexOf(e.stageId);
    const currentIndex = currentStage
      ? ["recipe_entered", "prediction_complete", "optimization_complete", "hybrid_evaluation", "operator_review", "actual_ttt", "validation", "archived"].indexOf(currentStage)
      : -1;

    let status: "completed" | "current" | "pending" = "pending";
    if (e.iso || (e.fallbackMins != null && stageIndex < currentIndex)) status = "completed";
    if (e.stageId === currentStage) status = "current";
    if (e.key === "val" && heat.validation?.validatedAt) status = "completed";
    if (e.key === "review" && heat.recommendationAcceptance) status = "completed";
    if (e.key === "opt" && heat.optimizer) status = "completed";
    if (e.key === "pred" && heat.prediction) status = "completed";

    return {
      time: formatTime(e.iso, status === "pending" ? undefined : e.fallbackMins),
      label: e.label,
      status,
    };
  });
}

export function filterHeatArchive(
  heats: HeatSessionSnapshot[],
  filters: {
    heatNumber?: string;
    shift?: string;
    date?: string;
    confidence?: string;
    validationStatus?: string;
    operatorDecision?: string;
  }
): HeatSessionSnapshot[] {
  return heats.filter((h) => {
    if (filters.heatNumber && !h.heatNumber.toLowerCase().includes(filters.heatNumber.toLowerCase())) return false;
    if (filters.shift && filters.shift !== "all" && h.shift !== filters.shift) return false;
    if (filters.date && h.lastUpdated && !h.lastUpdated.startsWith(filters.date)) return false;
    if (filters.confidence && filters.confidence !== "all") {
      const label = confidenceLabel(confidenceToScore(h.confidence));
      if (label.toLowerCase() !== filters.confidence.toLowerCase()) return false;
    }
    if (filters.validationStatus && filters.validationStatus !== "all") {
      const validated = !!h.validation?.validatedAt || parseActualTtt(h.validation?.actualTtt) != null;
      if (filters.validationStatus === "validated" && !validated) return false;
      if (filters.validationStatus === "pending" && validated) return false;
    }
    if (filters.operatorDecision && filters.operatorDecision !== "all") {
      if (h.recommendationAcceptance !== filters.operatorDecision) return false;
    }
    return true;
  });
}

export function buildDailyReportPayload(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[],
  shift: string
) {
  const today = getTodayHeats(active, sessionHistory);
  const production = computeTodayProduction(active, sessionHistory, shift);
  const shiftPerf = computeShiftPerformance(active, sessionHistory, shift);
  const kpis = computeExecutiveKpis(active, sessionHistory);

  return {
    generated_at: new Date().toISOString(),
    shift,
    production,
    shift_performance: shiftPerf,
    executive_kpis: kpis,
    session_mae: shiftPerf.sessionMae,
    heats: today.map((h) => ({
      heat_number: h.heatNumber,
      shift: h.shift,
      predicted_ttt: h.prediction?.predicted_ttt ?? null,
      optimized_saving: h.optimizer?.improvement_min ?? null,
      confidence: h.confidence,
      reliability: h.hybrid?.reliability_index ?? null,
      acceptance: h.recommendationAcceptance,
      validated: !!h.validation?.validatedAt,
      actual_ttt: h.validation?.actualTtt ?? null,
      charge: currentCharge(h.recipe),
      last_updated: h.lastUpdated,
    })),
  };
}

export function recordLifecycleTimestamp(
  existing: LifecycleTimestamps | undefined,
  key: keyof LifecycleTimestamps
): LifecycleTimestamps {
  const now = new Date().toISOString();
  return { ...existing, [key]: existing?.[key] ?? now };
}

export function touchOperatorActivity(
  activity: OperatorActivityEntry[],
  entry: Omit<OperatorActivityEntry, "id" | "timestamp"> & { timestamp?: string }
): OperatorActivityEntry[] {
  const full: OperatorActivityEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: entry.timestamp ?? new Date().toISOString(),
  };
  return [full, ...activity].slice(0, 100);
}

export function getTodayOperatorActivity(activity: OperatorActivityEntry[]): OperatorActivityEntry[] {
  return activity.filter((a) => isToday(a.timestamp));
}

export function chartDataFromToday(today: HeatSessionSnapshot[]) {
  const sorted = [...today].sort((a, b) => (a.lastUpdated ?? "").localeCompare(b.lastUpdated ?? ""));

  const tttTrend = sorted.map((h, i) => ({
    index: i + 1,
    heat: h.heatNumber || `#${i + 1}`,
    ttt: h.prediction?.predicted_ttt ?? 0,
  }));

  const savingTrend = sorted
    .filter((h) => h.optimizer)
    .map((h, i) => ({
      index: i + 1,
      heat: h.heatNumber || `#${i + 1}`,
      saving: h.optimizer?.improvement_min ?? 0,
    }));

  const confidenceDist = [
    { name: "High", count: today.filter((h) => confidenceLabel(confidenceToScore(h.confidence)) === "High").length },
    { name: "Medium", count: today.filter((h) => confidenceLabel(confidenceToScore(h.confidence)) === "Medium").length },
    { name: "Low", count: today.filter((h) => confidenceLabel(confidenceToScore(h.confidence)) === "Low").length },
  ];

  const chargeDist = sorted.map((h, i) => ({
    index: i + 1,
    charge: currentCharge(h.recipe),
  }));

  const durationHist = sorted.map((h) => ({
    duration: h.prediction?.predicted_ttt ?? 0,
  }));

  const acceptance = [
    { name: "Accepted", value: today.filter((h) => h.recommendationAcceptance === "Accepted").length },
    { name: "Modified", value: today.filter((h) => h.recommendationAcceptance === "Modified").length },
    { name: "Rejected", value: today.filter((h) => h.recommendationAcceptance === "Rejected").length },
    { name: "Pending", value: today.filter((h) => h.optimizer && !h.recommendationAcceptance).length },
  ];

  return { tttTrend, savingTrend, confidenceDist, chargeDist, durationHist, acceptance };
}

export type { RecommendationAcceptanceStatus };
