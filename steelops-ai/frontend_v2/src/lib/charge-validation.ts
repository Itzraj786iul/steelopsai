import type { HistoricalVariable } from "@/lib/api/eaf";

export const CHARGE_UI_MIN_T = 80;
export const CHARGE_UI_MAX_T = 150;

export type ConfidenceTier = "High" | "Medium" | "Low";

export interface ChargeBounds {
  p5: number;
  median: number;
  p95: number;
}

export interface ChargeAssessment {
  charge: number;
  bounds: ChargeBounds;
  confidence: ConfidenceTier;
  confidenceScore: number;
  warnings: string[];
}

const BURDEN_KEYS = ["HM", "DRI", "HBI", "Bucket"] as const;

/** Derive total-charge percentiles from burden variable historical stats. */
export function deriveChargeBounds(variables: HistoricalVariable[]): ChargeBounds {
  const byKey = Object.fromEntries(variables.map((v) => [v.variable, v]));
  const sum = (field: "p5" | "median" | "p95") =>
    BURDEN_KEYS.reduce((acc, key) => acc + (byKey[key]?.[field] ?? 0), 0);

  return { p5: sum("p5"), median: sum("median"), p95: sum("p95") };
}

const DEFAULT_CHARGE_BOUNDS: ChargeBounds = { p5: 112, median: 120, p95: 132 };

export function assessCharge(charge: number, variables?: HistoricalVariable[]): ChargeAssessment {
  const bounds = variables?.length ? deriveChargeBounds(variables) : DEFAULT_CHARGE_BOUNDS;
  const warnings: string[] = [];

  if (charge < CHARGE_UI_MIN_T || charge > CHARGE_UI_MAX_T) {
    warnings.push(
      "Total iron charge is outside the usual plant band (about 80–150 tonnes). The estimate may be less trustworthy."
    );
  } else if (charge < bounds.p5 || charge > bounds.p95) {
    warnings.push(
      `Total iron charge is outside the common historical band (~${bounds.p5.toFixed(0)}–${bounds.p95.toFixed(0)} t). The estimate may be less trustworthy.`
    );
  }

  const { confidence, confidenceScore } = computeConfidence(charge, bounds);

  return { charge, bounds, confidence, confidenceScore, warnings };
}

export function computeConfidence(
  value: number,
  bounds: ChargeBounds
): { confidence: ConfidenceTier; confidenceScore: number } {
  const { p5, median, p95 } = bounds;
  const span = Math.max(p95 - p5, 1);

  if (value >= p5 && value <= p95) {
    const distFromMedian = Math.abs(value - median) / span;
    if (distFromMedian <= 0.25) {
      return { confidence: "High", confidenceScore: 88 };
    }
    return { confidence: "Medium", confidenceScore: 68 };
  }

  const overshoot =
    value < p5 ? (p5 - value) / span : value > p95 ? (value - p95) / span : 0;

  if (overshoot <= 0.35) {
    return { confidence: "Medium", confidenceScore: 55 };
  }
  return { confidence: "Low", confidenceScore: Math.max(25, 45 - overshoot * 20) };
}

export function historicalStatusLabel(
  current: number,
  p5: number,
  p95: number
): { label: string; tone: "normal" | "caution" | "outside" } {
  if (current < p5) {
    return { label: "Lower than historical 5th percentile", tone: "caution" };
  }
  if (current > p95) {
    return { label: "Higher than historical 95th percentile", tone: "caution" };
  }
  if (current < p5 * 0.85 || current > p95 * 1.15) {
    return { label: "Outside historical experience", tone: "outside" };
  }
  return { label: "Within historical band", tone: "normal" };
}

export function parseRecipeNumber(raw: unknown, fallback = 0): number {
  if (raw === "" || raw === null || raw === undefined) return fallback;
  const num = typeof raw === "number" ? raw : parseFloat(String(raw));
  return Number.isFinite(num) ? num : fallback;
}
