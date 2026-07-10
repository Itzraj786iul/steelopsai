import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

export type HeatLifecycleStageId =
  | "recipe_entered"
  | "prediction_complete"
  | "optimization_complete"
  | "hybrid_evaluation"
  | "operator_review"
  | "actual_ttt"
  | "validation"
  | "archived";

export interface LifecycleStageDef {
  id: HeatLifecycleStageId;
  label: string;
  isComplete: (active: HeatSessionSnapshot) => boolean;
}

export const HEAT_LIFECYCLE_STAGES: LifecycleStageDef[] = [
  { id: "recipe_entered", label: "Recipe Entered", isComplete: (a) => !!a.recipe },
  { id: "prediction_complete", label: "Prediction Complete", isComplete: (a) => !!a.prediction },
  { id: "optimization_complete", label: "Optimization Complete", isComplete: (a) => !!a.optimizer },
  { id: "hybrid_evaluation", label: "Hybrid Evaluation", isComplete: (a) => !!a.hybrid },
  {
    id: "operator_review",
    label: "Operator Review",
    isComplete: (a) => !!a.recommendationAcceptance,
  },
  {
    id: "actual_ttt",
    label: "Actual TTT",
    isComplete: (a) => {
      const v = a.validation?.actualTtt;
      return !!v && v !== "Pending" && !Number.isNaN(parseFloat(v));
    },
  },
  {
    id: "validation",
    label: "Validation",
    isComplete: (a) => !!a.validation?.validatedAt,
  },
  { id: "archived", label: "Archived", isComplete: (a) => !!a.archived },
];

export function deriveCurrentLifecycleStage(active: HeatSessionSnapshot | null): HeatLifecycleStageId | null {
  if (!active) return null;
  for (const stage of HEAT_LIFECYCLE_STAGES) {
    if (!stage.isComplete(active)) return stage.id;
  }
  return "archived";
}

export function lifecycleStageStatus(
  stageId: HeatLifecycleStageId,
  active: HeatSessionSnapshot | null
): "completed" | "current" | "pending" {
  if (!active) return "pending";
  const current = deriveCurrentLifecycleStage(active);
  const stageIndex = HEAT_LIFECYCLE_STAGES.findIndex((s) => s.id === stageId);
  const currentIndex = HEAT_LIFECYCLE_STAGES.findIndex((s) => s.id === current);
  if (stageIndex < currentIndex) return "completed";
  if (stageId === current) return "current";
  return "pending";
}
