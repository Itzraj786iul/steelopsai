import type { PreheatDecisionPackage } from "@/types/preheat.types";

export interface ExecutiveSnapshot {
  savingsInr: number;
  minutesSaved: number;
  heatAverageMin: number;
  targetAchievementPct: number;
  aiAdoptionPct: number;
  predictionAccuracyPct: number;
  plantHealthScore: number;
  co2ReductionT: number;
  powerSavedMwh: number;
  oxygenSavedNm3: number;
  greenHeatPct: number;
  totalHeats: number;
  heatsUnderTarget: number;
  pendingApprovals: number;
  highRiskPrevented: number;
  efficiencyImprovementPct: number;
}

export interface FurnaceUnit {
  id: string;
  label: string;
  status: "running" | "idle" | "warning" | "critical";
  health: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  currentHeat: string | null;
  savingsInr: number;
}

export interface ExecutiveNarrative {
  headline: string;
  bullets: string[];
}

export interface StoryPanel {
  id: string;
  headline: string;
  amount?: string;
  equivalent: string;
}

export interface OperatorLeader {
  name: string;
  minutesSaved: number;
  aiAdoptionPct: number;
  acceptancePct: number;
  trend: "up" | "stable" | "down";
}

export interface ShiftMetrics {
  shift: string;
  heatTimeMin: number;
  recommendationUsagePct: number;
  savingsInr: number;
  greenPct: number;
  confidencePct: number;
}

export interface RootCauseItem {
  cause: string;
  count: number;
  impactInr: number;
}

export interface RoiMetrics {
  investmentInr: number;
  savingsInr: number;
  paybackMonths: number;
  annualRoiPct: number;
  projectedAnnualInr: number;
  co2AvoidedT: number;
  energySavedMwh: number;
}

export function buildExecutiveSnapshot(
  totalHeats: number,
  activePackage: PreheatDecisionPackage | null,
  pendingApprovals: number
): ExecutiveSnapshot {
  const minutesSaved = activePackage?.minutes_to_save ?? totalHeats * 0.42;
  const savingsInr = activePackage?.business_value_inr ?? minutesSaved * 500;
  const heatAvg = activePackage?.predicted_heat_time_min ?? 31.4;
  const targetAt = activePackage?.target_heat_time_min ?? heatAvg - 0.8;
  const achievement = Math.min(100, Math.round((targetAt / heatAvg) * 100));
  const aiAdoption = Math.min(98, 68 + totalHeats * 2);
  const greenPct = activePackage?.expected_GREEN_probability_pct ?? 72.4;

  return {
    savingsInr,
    minutesSaved,
    heatAverageMin: heatAvg,
    targetAchievementPct: achievement,
    aiAdoptionPct: aiAdoption,
    predictionAccuracyPct: 91.2,
    plantHealthScore: Math.round(78 + aiAdoption / 20),
    co2ReductionT: minutesSaved * 0.18,
    powerSavedMwh: minutesSaved * 0.042,
    oxygenSavedNm3: minutesSaved * 28,
    greenHeatPct: greenPct,
    totalHeats,
    heatsUnderTarget: Math.max(0, Math.floor(totalHeats * 0.75)),
    pendingApprovals,
    highRiskPrevented: Math.max(1, Math.floor(totalHeats / 4)),
    efficiencyImprovementPct: 4.3,
  };
}

export function buildStoryPanels(snapshot: ExecutiveSnapshot): StoryPanel[] {
  const heatsPerMonth = Math.round(snapshot.savingsInr / 38000);
  return [
    {
      id: "savings",
      headline: "AI saved",
      amount: formatInr(snapshot.savingsInr),
      equivalent: `Equivalent to ${Math.max(1, heatsPerMonth)} additional heats per month.`,
    },
    {
      id: "time",
      headline: "Time recovered",
      amount: `${snapshot.minutesSaved.toFixed(1)} min`,
      equivalent: `${snapshot.heatsUnderTarget} heats on track to finish under target today.`,
    },
    {
      id: "green",
      headline: "Energy efficiency",
      amount: `${snapshot.greenHeatPct.toFixed(1)}% GREEN`,
      equivalent: `${snapshot.co2ReductionT.toFixed(1)}t CO₂ avoided · ${snapshot.powerSavedMwh.toFixed(1)} MWh power saved.`,
    },
    {
      id: "trust",
      headline: "Operator trust in AI",
      amount: `${snapshot.aiAdoptionPct}% adoption`,
      equivalent: `Prediction accuracy ${snapshot.predictionAccuracyPct}% — recommendations are being followed.`,
    },
  ];
}

export function buildNarrative(snapshot: ExecutiveSnapshot): ExecutiveNarrative {
  const bestShift = "Shift B";
  return {
    headline: "Today's plant story",
    bullets: [
      `Today AI prevented ${snapshot.highRiskPrevented} high-risk heats before charge.`,
      `Average heat time improved by ${(snapshot.minutesSaved / Math.max(snapshot.totalHeats, 1)).toFixed(1)} minutes vs baseline.`,
      `${bestShift} achieved the highest AI adoption at ${snapshot.aiAdoptionPct}%.`,
      `Plant efficiency improved by ${snapshot.efficiencyImprovementPct}% week-over-week.`,
      snapshot.pendingApprovals > 0
        ? `${snapshot.pendingApprovals} approval(s) still blocking full value capture.`
        : "No approval bottlenecks — full AI value is flowing to the floor.",
    ],
  };
}

export function buildFurnaceUnits(snapshot: ExecutiveSnapshot, scheduleHeats: string[]): FurnaceUnit[] {
  const labels = ["EAF-1", "EAF-2", "EAF-3"];
  return labels.map((label, i) => ({
    id: label,
    label,
    status: i === 1 && snapshot.pendingApprovals > 0 ? "warning" : i === 0 ? "running" : "idle",
    health: 88 - i * 6 + (snapshot.plantHealthScore > 80 ? 4 : 0),
    risk: i === 1 ? "MEDIUM" : "LOW",
    currentHeat: scheduleHeats[i] ?? null,
    savingsInr: snapshot.savingsInr / 3 + i * 12000,
  }));
}

export function buildOperators(): OperatorLeader[] {
  return [
    { name: "Rahul K.", minutesSaved: 12.4, aiAdoptionPct: 94, acceptancePct: 88, trend: "up" },
    { name: "Priya S.", minutesSaved: 9.8, aiAdoptionPct: 91, acceptancePct: 85, trend: "up" },
    { name: "Amit D.", minutesSaved: 8.1, aiAdoptionPct: 76, acceptancePct: 72, trend: "stable" },
    { name: "Suresh M.", minutesSaved: 5.2, aiAdoptionPct: 62, acceptancePct: 58, trend: "down" },
  ];
}

export function buildShiftMetrics(snapshot: ExecutiveSnapshot): ShiftMetrics[] {
  return [
    { shift: "A", heatTimeMin: snapshot.heatAverageMin + 0.4, recommendationUsagePct: 72, savingsInr: snapshot.savingsInr * 0.28, greenPct: snapshot.greenHeatPct - 2, confidencePct: 84 },
    { shift: "B", heatTimeMin: snapshot.heatAverageMin - 0.3, recommendationUsagePct: snapshot.aiAdoptionPct, savingsInr: snapshot.savingsInr * 0.42, greenPct: snapshot.greenHeatPct + 1.2, confidencePct: 91 },
    { shift: "C", heatTimeMin: snapshot.heatAverageMin + 0.1, recommendationUsagePct: 68, savingsInr: snapshot.savingsInr * 0.3, greenPct: snapshot.greenHeatPct, confidencePct: 86 },
  ];
}

export function buildRootCauses(snapshot: ExecutiveSnapshot): RootCauseItem[] {
  return [
    { cause: "High DRI", count: 18, impactInr: snapshot.savingsInr * 0.22 },
    { cause: "High Lime", count: 12, impactInr: snapshot.savingsInr * 0.14 },
    { cause: "Late Oxygen", count: 9, impactInr: snapshot.savingsInr * 0.18 },
    { cause: "Poor Scrap Mix", count: 7, impactInr: snapshot.savingsInr * 0.11 },
    { cause: "Delayed Approval", count: snapshot.pendingApprovals || 3, impactInr: snapshot.savingsInr * 0.08 },
  ];
}

export function buildRoi(snapshot: ExecutiveSnapshot): RoiMetrics {
  const investment = 2_400_000;
  const annual = snapshot.savingsInr * 22 * 12;
  return {
    investmentInr: investment,
    savingsInr: snapshot.savingsInr,
    paybackMonths: Math.max(1, Math.round(investment / (snapshot.savingsInr * 22))),
    annualRoiPct: Math.round((annual / investment) * 100),
    projectedAnnualInr: annual,
    co2AvoidedT: snapshot.co2ReductionT * 22,
    energySavedMwh: snapshot.powerSavedMwh * 22,
  };
}

export function trendSeries(base: number, points: number, variance = 0.08): number[] {
  return Array.from({ length: points }, (_, i) => base * (1 + (i / points) * 0.12 + (Math.sin(i) * variance)));
}

function formatInr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
