"use client";

import { eafApi, type EafRecipe, type HeatRecord, DEFAULT_RECIPE } from "@/lib/api/eaf";
import { mesApi } from "@/lib/api/mes";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { useOpsContextStore } from "@/stores/ops-context-store";

function attribution() {
  const user = useAuthStore.getState().user;
  const ctx = useOpsContextStore.getState();
  return {
    operator_id: user?.id || "",
    operator_name: user?.full_name || user?.email || "",
    furnace_id: ctx.furnaceId || "EAF-1",
    plant: ctx.plant || "JSPL",
    supervisor_id: ctx.supervisorId || undefined,
    predicted_by: user?.id,
    optimized_by: user?.id,
    validated_by: user?.id,
  };
}

async function notifyMes(
  heatNumber: string | undefined,
  event: string,
  sessionId?: string,
  heatRecordId?: string,
  recipe?: EafRecipe
) {
  if (!heatNumber) return;
  try {
    await mesApi.aiEvent({
      heat_number: heatNumber,
      event,
      session_id: sessionId,
      heat_record_id: heatRecordId,
      recipe: recipe as unknown as Record<string, unknown> | undefined,
    });
  } catch {
    /* planned heat may not exist — ignore */
  }
}

/** Load a MES planned heat into the current session (recipe pre-filled). */
export async function openPlannedHeat(heatNumber: string): Promise<boolean> {
  try {
    const { data } = await mesApi.getHeatByNumber(heatNumber);
    const recipe = { ...DEFAULT_RECIPE, ...(data.recipe || {}) } as EafRecipe;
    const store = useCurrentHeatStore.getState();
    store.setHeatNumber(heatNumber);
    store.setRecipe(recipe);
    if (data.assigned_furnace) {
      useOpsContextStore.getState().setFurnaceId(data.assigned_furnace);
    }
    await notifyMes(heatNumber, "heat_start", store.active?.id);
    return true;
  } catch {
    return false;
  }
}

/** Fire-and-forget sync of current heat session → permanent HeatRecord DB + MES. */
export async function syncHeatAfterPrediction(): Promise<HeatRecord | null> {
  const active = useCurrentHeatStore.getState().active;
  if (!active?.prediction) return null;
  const attr = attribution();
  try {
    const { data } = await eafApi.heatFromPrediction({
      heat_number: active.heatNumber || undefined,
      session_id: active.id,
      recipe_inputs: active.recipe,
      prediction: active.prediction,
      hybrid: active.hybrid,
      operator_id: attr.operator_id,
      operator_name: attr.operator_name,
      furnace_id: attr.furnace_id,
      plant: attr.plant,
      supervisor_id: attr.supervisor_id,
      predicted_by: attr.predicted_by,
    });
    await notifyMes(active.heatNumber, "prediction", active.id, data.id, active.recipe);
    return data;
  } catch {
    return null;
  }
}

export async function syncHeatAfterOptimizer(): Promise<HeatRecord | null> {
  const active = useCurrentHeatStore.getState().active;
  if (!active) return null;
  const attr = attribution();
  try {
    const { data } = await eafApi.heatFromOptimizer({
      heat_number: active.heatNumber || undefined,
      session_id: active.id,
      recipe_inputs: active.recipe,
      optimizer: active.optimizer,
      optimizer_v2: active.optimizerV2,
      recommendation_status: active.recommendationAcceptance,
      optimized_by: attr.optimized_by,
    });
    const event =
      active.recommendationAcceptance === "Accepted" ? "recommendation_accepted" : "optimization";
    await notifyMes(active.heatNumber, "optimization", active.id, data.id, active.recipe);
    if (event === "recommendation_accepted") {
      await notifyMes(active.heatNumber, "recommendation_accepted", active.id, data.id);
    }
    return data;
  } catch {
    return null;
  }
}

export async function syncHeatAfterValidation(): Promise<HeatRecord | null> {
  const active = useCurrentHeatStore.getState().active;
  if (!active) return null;
  const attr = attribution();
  try {
    const { data } = await eafApi.heatFromValidation({
      heat_number: active.heatNumber || undefined,
      session_id: active.id,
      predicted_ttt: active.prediction?.predicted_ttt,
      actual_ttt: active.validation?.actualTtt ?? null,
      operator_comments: active.validation?.operatorComments || "",
      recommendation_status: active.recommendationAcceptance,
      actual_recipe: active.recipe as unknown as Record<string, unknown>,
      validated_by: attr.validated_by,
      furnace_id: attr.furnace_id,
      supervisor_id: attr.supervisor_id,
      plant: attr.plant,
    });
    await notifyMes(active.heatNumber, "validation", active.id, data.id, active.recipe);
    await notifyMes(active.heatNumber, "completed", active.id, data.id);
    return data;
  } catch {
    return null;
  }
}
