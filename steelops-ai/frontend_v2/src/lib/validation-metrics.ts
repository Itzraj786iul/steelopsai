import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

export interface SessionValidationMetrics {
  predictionError: number | null;
  absoluteError: number | null;
  optimizerImprovement: number | null;
  predictionBias: number | null;
  sessionMae: number | null;
}

function parseActualTtt(value: string | undefined): number | null {
  if (!value || value === "Pending") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function computeHeatValidationMetrics(active: HeatSessionSnapshot | null): SessionValidationMetrics {
  if (!active?.prediction) {
    return {
      predictionError: null,
      absoluteError: null,
      optimizerImprovement: null,
      predictionBias: null,
      sessionMae: null,
    };
  }

  const predicted = active.prediction.predicted_ttt;
  const actual = parseActualTtt(active.validation?.actualTtt);
  const predictionError = actual != null ? predicted - actual : null;
  const absoluteError = predictionError != null ? Math.abs(predictionError) : null;
  const optimizerImprovement = active.optimizer?.improvement_min ?? null;
  const predictionBias = predictionError;

  return {
    predictionError,
    absoluteError,
    optimizerImprovement,
    predictionBias,
    sessionMae: null,
  };
}

export function computeSessionMae(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[] = []
): number | null {
  const heats = [...sessionHistory];
  if (active) heats.unshift(active);

  const errors = heats
    .map((h) => {
      const pred = h.prediction?.predicted_ttt;
      const actual = parseActualTtt(h.validation?.actualTtt);
      if (pred == null || actual == null) return null;
      return Math.abs(pred - actual);
    })
    .filter((e): e is number => e != null);

  if (!errors.length) return null;
  return errors.reduce((a, b) => a + b, 0) / errors.length;
}

export function computeSessionMaeFromStore(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[]
): number | null {
  return computeSessionMae(active, sessionHistory);
}

export interface ProductionSummaryStats {
  totalHeats: number;
  avgPredictedTtt: number | null;
  avgConfidenceScore: number | null;
  avgOptimizerSaving: number | null;
  avgReliability: number | null;
  highestSaving: number | null;
  lowestSaving: number | null;
}

function confidenceToScore(confidence: string | null | undefined): number | null {
  if (!confidence) return null;
  const lower = confidence.toLowerCase();
  if (lower.includes("high")) return 3;
  if (lower.includes("medium") || lower.includes("moderate")) return 2;
  if (lower.includes("low")) return 1;
  return null;
}

function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function computeProductionSummary(
  active: HeatSessionSnapshot | null,
  sessionHistory: HeatSessionSnapshot[]
): ProductionSummaryStats {
  const todayHeats = sessionHistory.filter((h) => isToday(h.lastUpdated));
  const allToday = active && isToday(active.lastUpdated) ? [active, ...todayHeats.filter((h) => h.id !== active.id)] : todayHeats;

  const predictions = allToday.map((h) => h.prediction?.predicted_ttt).filter((v): v is number => v != null);
  const savings = allToday.map((h) => h.optimizer?.improvement_min).filter((v): v is number => v != null);
  const reliabilities = allToday.map((h) => h.hybrid?.reliability_index).filter((v): v is number => v != null);
  const confidenceScores = allToday.map((h) => confidenceToScore(h.confidence)).filter((v): v is number => v != null);

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  return {
    totalHeats: allToday.length,
    avgPredictedTtt: avg(predictions),
    avgConfidenceScore: avg(confidenceScores),
    avgOptimizerSaving: avg(savings),
    avgReliability: avg(reliabilities),
    highestSaving: savings.length ? Math.max(...savings) : null,
    lowestSaving: savings.length ? Math.min(...savings) : null,
  };
}
