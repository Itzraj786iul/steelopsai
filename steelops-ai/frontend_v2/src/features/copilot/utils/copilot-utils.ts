import {
  alternativeToRecipe,
  diffRecipes,
  formatPortfolioLabel,
  PORTFOLIO_ORDER,
} from "@/features/preheat/utils/preheat-utils";
import type { AlternativeRecipe, PreheatDecisionPackage, RecipeRecord } from "@/types/preheat.types";
import type { PortfolioSlot } from "@/stores/copilot-store";

export interface PortfolioView {
  slot: PortfolioSlot;
  label: string;
  recipe: RecipeRecord;
  predictedAt: number;
  targetAt: number;
  minutesToSave: number;
  businessValueInr: number;
  confidenceTier: string;
  confidenceScore: number;
  greenPct: number;
  power: number;
  warnings: string[];
  reasoning: string;
  alternative?: AlternativeRecipe;
  modelVersion?: string;
  predictionInterval95?: { low: number; high: number };
  predictionQuality?: string;
  shapDrivers?: Array<{ feature: string; mean_abs_shap?: number }>;
  uncertainty?: number;
}

export function interpolateTwinValue(baseline: number, optimized: number, progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return baseline + (optimized - baseline) * t;
}

export function buildComparisonChartData(
  planned: Record<string, number>,
  optimized: RecipeRecord,
  predictedAt: number,
  targetAt: number,
  baselineGreen: number,
  optimizedGreen: number,
  baselinePower: number,
  optimizedPower: number
) {
  return [
    { metric: "HM", current: Number(planned.HM ?? 0), optimized: Number(optimized.HM ?? 0) },
    { metric: "DRI", current: Number(planned.DRI ?? 0), optimized: Number(optimized.DRI ?? 0) },
    { metric: "CPC", current: Number(planned.CPC ?? 0), optimized: Number(optimized.CPC ?? 0) },
    { metric: "AT", current: predictedAt, optimized: targetAt },
    { metric: "GREEN", current: baselineGreen, optimized: optimizedGreen },
    { metric: "Power", current: baselinePower / 1000, optimized: optimizedPower / 1000 },
  ];
}

export function findAlternative(pkg: PreheatDecisionPackage, slot: PortfolioSlot): AlternativeRecipe | undefined {
  if (slot === "recommended") return undefined;
  return pkg.alternative_recipes.find((alt) => alt.portfolio_slot === slot);
}

export function buildPortfolioView(pkg: PreheatDecisionPackage, slot: PortfolioSlot): PortfolioView {
  if (slot === "recommended") {
    const interval95 = pkg.prediction_interval?.["95"];
    return {
      slot,
      label: "Recommended",
      recipe: pkg.recommended_optimized_recipe,
      predictedAt: pkg.predicted_heat_time_min,
      targetAt: pkg.target_heat_time_min,
      minutesToSave: pkg.minutes_to_save,
      businessValueInr: pkg.business_value_inr,
      confidenceTier: pkg.confidence_tier,
      confidenceScore: pkg.confidence_score,
      greenPct: pkg.expected_GREEN_probability_pct,
      power: pkg.expected_POWER,
      warnings: pkg.validation_errors,
      reasoning: pkg.engineering_reasoning,
      modelVersion: pkg.model_version,
      predictionInterval95: interval95,
      predictionQuality: pkg.prediction_quality,
      shapDrivers: pkg.shap_summary?.slice(0, 5),
      uncertainty: pkg.uncertainty,
    };
  }

  const alt = findAlternative(pkg, slot);
  if (!alt) {
    return buildPortfolioView(pkg, "recommended");
  }

  const recipe = alternativeToRecipe(alt);
  const predictedAt = Number(alt.predicted_heat_time_min ?? pkg.predicted_heat_time_min);
  const save = Number(alt.expected_at_reduction_min ?? pkg.minutes_to_save);
  const targetAt = Math.max(0, predictedAt - save);

  return {
    slot,
    label: formatPortfolioLabel(alt),
    recipe,
    predictedAt,
    targetAt,
    minutesToSave: save,
    businessValueInr: save * 500,
    confidenceTier: String(alt.confidence ?? pkg.confidence_tier),
    confidenceScore: Number(alt.confidence_score ?? pkg.confidence_score),
    greenPct: Number(alt.expected_GREEN_pct ?? pkg.expected_GREEN_probability_pct),
    power: Number(alt.expected_POWER ?? pkg.expected_POWER),
    warnings: alt.warnings ? [String(alt.warnings)] : [],
    reasoning: String(alt.why_generated ?? alt.fallback_recommendation ?? pkg.engineering_reasoning),
    alternative: alt,
  };
}

export function recipeDeltas(pkg: PreheatDecisionPackage, portfolio: PortfolioView) {
  return diffRecipes(pkg.planned_recipe, portfolio.recipe);
}

export function exportPackageJson(pkg: PreheatDecisionPackage) {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${pkg.package_id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function resolvePortfolioSlot(value: string): PortfolioSlot {
  const slots: PortfolioSlot[] = ["recommended", ...PORTFOLIO_ORDER.map((p) => p.slot)];
  return slots.includes(value as PortfolioSlot) ? (value as PortfolioSlot) : "recommended";
}

export const TIMELINE_STEPS = [
  { id: "planned", label: "Planned Recipe" },
  { id: "prediction", label: "Prediction" },
  { id: "optimization", label: "Optimization" },
  { id: "validation", label: "Validation" },
  { id: "twin", label: "Digital Twin" },
  { id: "approval", label: "Approval" },
  { id: "ready", label: "Ready To Execute" },
] as const;

export function timelineProgress(pkg: PreheatDecisionPackage): number {
  let step = 2;
  if (pkg.recommended_optimized_recipe) step = 3;
  if (pkg.validation_errors.length === 0) step = 4;
  if (pkg.digital_twin_comparison.comparison_id) step = 5;
  if (pkg.approval_requirements) step = 6;
  if (pkg.copilot_ready) step = 7;
  return step;
}
