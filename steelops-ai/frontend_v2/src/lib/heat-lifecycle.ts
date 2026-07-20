import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

export type HeatLifecycleStageId =
  | "recipe_entered"
  | "prediction_complete"
  | "optimization_complete"
  | "operator_review"
  | "validation"
  | "archived";

export interface LifecycleStageDef {
  id: HeatLifecycleStageId;
  label: string;
  isComplete: (active: HeatSessionSnapshot) => boolean;
}

/** Align with floor strip: recipe → predict → optimize → review → validate → done. */
export const HEAT_LIFECYCLE_STAGES: LifecycleStageDef[] = [
  { id: "recipe_entered", label: "Recipe Entered", isComplete: (a) => !!a.recipe },
  { id: "prediction_complete", label: "Prediction", isComplete: (a) => !!a.prediction },
  { id: "optimization_complete", label: "Optimization", isComplete: (a) => !!a.optimizer },
  {
    id: "operator_review",
    label: "Operator Decision",
    isComplete: (a) => !!a.recommendationLocked,
  },
  {
    id: "validation",
    label: "Validation",
    isComplete: (a) => !!a.validation?.validatedAt,
  },
  { id: "archived", label: "Saved", isComplete: (a) => !!a.archived || !!a.validation?.validatedAt },
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

/** True when actual TTT is saved (or archived) — operator should start New Heat. */
export function isHeatPathComplete(active: HeatSessionSnapshot | null): boolean {
  if (!active) return false;
  if (active.archived || active.validation?.validatedAt) return true;
  const v = active.validation?.actualTtt;
  return !!v && v !== "Pending" && !Number.isNaN(parseFloat(v));
}
