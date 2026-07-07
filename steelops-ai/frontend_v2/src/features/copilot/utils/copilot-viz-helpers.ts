import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { FlowStep, ReasoningNode, SimilarHeatNode, ShapDriver } from "@/components/industrial/types";
import type { LearningReference, PreheatDecisionPackage } from "@/types/preheat.types";
import { formatDurationMinutes } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";

export function buildDecisionFlowSteps(pkg: PreheatDecisionPackage, portfolio: PortfolioView): FlowStep[] {
  return [
    { id: "recipe", label: "Current recipe", value: "Planned charge", status: "complete", description: `Grade ${pkg.grade}` },
    { id: "analysis", label: "AI analysis", value: formatDurationMinutes(portfolio.predictedAt), status: "complete", description: portfolio.modelVersion ?? "SIFM" },
    { id: "twin", label: "Virtual twin", value: pkg.digital_twin_comparison.comparison_id ? "Simulated" : "Pending", status: pkg.digital_twin_comparison.comparison_id ? "complete" : "pending" },
    { id: "rec", label: "Recommendation", value: portfolio.label, status: "active", description: portfolio.reasoning.slice(0, 120) },
    { id: "approval", label: "Approval", value: pkg.approval_requirements, status: pkg.copilot_ready ? "warning" : "pending" },
  ];
}

export function buildRecommendationPipeline(
  pkg: PreheatDecisionPackage,
  portfolio: PortfolioView,
  primaryAction?: string
): FlowStep[] {
  const driDelta = Number(portfolio.recipe.DRI ?? 0) - Number(pkg.planned_recipe.DRI ?? 0);
  const action = primaryAction ?? pkg.operator_actions[0] ?? "Apply optimized recipe";
  return [
    { id: "current", label: "Current", value: `DRI ${Number(pkg.planned_recipe.DRI ?? 0).toFixed(1)}t`, status: "complete" },
    { id: "recommended", label: "Recommended", value: `DRI ${Number(portfolio.recipe.DRI ?? 0).toFixed(1)}t`, status: "active", description: driDelta !== 0 ? `Δ ${driDelta > 0 ? "+" : ""}${driDelta.toFixed(1)}t` : undefined },
    { id: "impact", label: "Expected impact", value: formatDurationMinutes(portfolio.minutesToSave), status: "complete" },
    { id: "confidence", label: "Confidence", value: portfolio.confidenceTier, status: "complete", description: `${portfolio.confidenceScore.toFixed(0)}%` },
    { id: "value", label: "Business value", value: formatCurrency(portfolio.businessValueInr), status: "complete" },
    { id: "action", label: "Operator action", value: action, status: "warning" },
  ];
}

export function buildReasoningNodes(pkg: PreheatDecisionPackage, portfolio: PortfolioView): ReasoningNode[] {
  const topFeature = portfolio.shapDrivers?.[0]?.feature ?? "Recipe mix";
  const stage = pkg.digital_twin_comparison.optimized_dominant_stage ?? "refining";
  return [
    { id: "var", label: "Variable", body: topFeature, kind: "variable" },
    { id: "mech", label: "Physical mechanism", body: pkg.root_cause, kind: "mechanism" },
    { id: "stage", label: "Process stage", body: `Dominant stage shifts toward ${stage}. ${pkg.digital_twin_comparison.stage_explanation ?? ""}`, kind: "stage" },
    { id: "impact", label: "Business impact", body: `${formatDurationMinutes(portfolio.minutesToSave)} recoverable · ${formatCurrency(portfolio.businessValueInr)} · GREEN ${portfolio.greenPct.toFixed(1)}%`, kind: "impact" },
    { id: "rec", label: "Recommendation", body: pkg.operator_actions.join(" · ") || portfolio.reasoning, kind: "action" },
  ];
}

export function buildSimilarHeats(currentLabel: string, references: LearningReference[]): SimilarHeatNode[] {
  return references.slice(0, 6).map((ref, i) => ({
    id: ref.lesson_id ?? `sim-${i}`,
    label: ref.lesson_id?.slice(0, 6) ?? `H${i + 1}`,
    distance: 0.15 + i * 0.12,
    outcome: ref.avg_realised_improvement_min != null ? `−${ref.avg_realised_improvement_min.toFixed(1)} min` : "Similar",
    recipe: ref.action ?? "Optimized mix",
    greenProbability: ref.confidence === "HIGH" ? 88 : ref.confidence === "LOW" ? 62 : 75,
  }));
}

export function buildShapDrivers(portfolio: PortfolioView): ShapDriver[] {
  return (portfolio.shapDrivers ?? []).map((d) => ({
    feature: d.feature,
    impact: d.mean_abs_shap ?? 0,
  }));
}

export function executionTimelineStep(pkg: PreheatDecisionPackage): number {
  if (!pkg.copilot_ready) return 3;
  return 4;
}

export function buildRadarData(
  planned: Record<string, number>,
  optimized: Record<string, number | string>,
  predictedAt: number,
  targetAt: number,
  greenPlanned: number,
  greenOpt: number
) {
  return [
    { metric: "HM", current: Number(planned.HM ?? 0), optimized: Number(optimized.HM ?? 0) },
    { metric: "DRI", current: Number(planned.DRI ?? 0), optimized: Number(optimized.DRI ?? 0) },
    { metric: "CPC", current: Number(planned.CPC ?? 0), optimized: Number(optimized.CPC ?? 0) },
    { metric: "AT", current: predictedAt, optimized: targetAt },
    { metric: "GREEN", current: greenPlanned, optimized: greenOpt },
  ];
}
