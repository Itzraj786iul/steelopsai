"use client";

import { eafApi, type EafRecipe, type HeatRecord, DEFAULT_RECIPE } from "@/lib/api/eaf";
import { mesApi } from "@/lib/api/mes";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrentHeatStore, type HeatSessionSnapshot } from "@/stores/current-heat-store";
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

function rememberRecordId(data: HeatRecord | null | undefined) {
  if (data?.id) {
    useCurrentHeatStore.getState().setHeatRecordId(data.id);
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

export async function archiveHeatRecord(heatRecordId: string): Promise<void> {
  if (!heatRecordId) return;
  try {
    await eafApi.heatArchive(heatRecordId);
  } catch {
    /* best-effort — next session must still insert a new row */
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
      heat_record_id: active.heatRecordId || undefined,
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
    rememberRecordId(data);
    await notifyMes(active.heatNumber, "prediction", active.id, data.id, active.recipe);
    return data;
  } catch (err) {
    console.error("[heat-history] prediction sync failed", err);
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
      heat_record_id: active.heatRecordId || undefined,
      recipe_inputs: active.recipe,
      optimizer: active.optimizer,
      optimizer_v2: active.optimizerV2,
      recommendation_status: active.recommendationAcceptance,
      optimized_by: attr.optimized_by,
    });
    rememberRecordId(data);
    const event =
      active.recommendationAcceptance === "Accepted" ? "recommendation_accepted" : "optimization";
    await notifyMes(active.heatNumber, "optimization", active.id, data.id, active.recipe);
    if (event === "recommendation_accepted") {
      await notifyMes(active.heatNumber, "recommendation_accepted", active.id, data.id);
    }
    return data;
  } catch (err) {
    console.error("[heat-history] optimizer sync failed", err);
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
      heat_record_id: active.heatRecordId || undefined,
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
    rememberRecordId(data);
    await notifyMes(active.heatNumber, "validation", active.id, data.id, active.recipe);
    await notifyMes(active.heatNumber, "completed", active.id, data.id);
    return data;
  } catch (err) {
    console.error("[heat-history] validation sync failed", err);
    return null;
  }
}

/**
 * Re-push every local sessionHistory heat into SQLite.
 * Also recovers from prediction/recommendation audits when sessionHistory was wiped.
 * Must run on the browser that still holds localStorage (operator machine).
 */
export async function recoverSessionHistoryToServer(): Promise<number> {
  const { active, sessionHistory } = useCurrentHeatStore.getState();
  const sessions: HeatSessionSnapshot[] = [];
  if (active?.prediction) sessions.push(active);
  for (const s of sessionHistory) {
    if (s.prediction && !sessions.some((x) => x.id === s.id)) sessions.push(s);
  }

  // Fallback: rebuild minimal sessions from enterprise audit (same browser).
  if (!sessions.length) {
    try {
      const { useAuditStore } = await import("@/stores/audit-store");
      const { predictionAudits, recommendationAudits } = useAuditStore.getState();
      for (const audit of predictionAudits) {
        if (!audit.heatSessionId || !audit.inputRecipe) continue;
        if (sessions.some((x) => x.id === audit.heatSessionId)) continue;
        const rec = recommendationAudits.find((r) => r.heatSessionId === audit.heatSessionId);
        sessions.push({
          id: audit.heatSessionId,
          heatRecordId: null,
          heatNumber: audit.heatNumber || "",
          shift: audit.shift || audit.inputRecipe.Shift || "B",
          recipe: audit.inputRecipe,
          prediction: {
            predicted_ttt: audit.predictedTtt,
            confidence: audit.confidence || "Medium",
          } as HeatSessionSnapshot["prediction"],
          hybrid: null,
          optimizer: rec?.optimizedRecipe
            ? ({
                optimized_recipe: rec.optimizedRecipe,
                improvement_min: rec.improvementMin,
              } as unknown as HeatSessionSnapshot["optimizer"])
            : null,
          optimizerV2: null,
          validation: rec?.validationOutcome
            ? { actualTtt: rec.validationOutcome, operatorComments: "" }
            : audit.validationStatus === "Validated"
              ? { actualTtt: "Pending", operatorComments: "Recovered from audit" }
              : null,
          confidence: audit.confidence,
          lastUpdated: audit.timestamp,
          warnings: [],
          recommendationAcceptance: rec?.acceptance ?? null,
          archived: false,
        });
      }
    } catch (err) {
      console.error("[heat-history] audit recover unavailable", err);
    }
  }

  if (!sessions.length) return 0;

  const attr = attribution();
  let recovered = 0;
  for (const session of sessions) {
    try {
      const { data } = await eafApi.heatFromPrediction({
        heat_number: session.heatNumber || undefined,
        session_id: session.id,
        heat_record_id: session.heatRecordId || undefined,
        recipe_inputs: session.recipe,
        prediction: session.prediction!,
        hybrid: session.hybrid,
        operator_id: attr.operator_id,
        operator_name: attr.operator_name,
        furnace_id: attr.furnace_id,
        plant: attr.plant,
        supervisor_id: attr.supervisor_id,
        predicted_by: attr.predicted_by,
      });
      if (session.id === active?.id) rememberRecordId(data);
      else if (data?.id) {
        // Update history entry with permanent id
        const store = useCurrentHeatStore.getState();
        const nextHistory = store.sessionHistory.map((h) =>
          h.id === session.id ? { ...h, heatRecordId: data.id } : h
        );
        useCurrentHeatStore.setState({ sessionHistory: nextHistory });
      }

      if (session.optimizer || session.optimizerV2 || session.recommendationAcceptance) {
        await eafApi.heatFromOptimizer({
          heat_number: session.heatNumber || undefined,
          session_id: session.id,
          heat_record_id: data.id,
          recipe_inputs: session.recipe,
          optimizer: session.optimizer,
          optimizer_v2: session.optimizerV2,
          recommendation_status: session.recommendationAcceptance,
          optimized_by: attr.optimized_by,
        });
      }
      if (session.validation) {
        await eafApi.heatFromValidation({
          heat_number: session.heatNumber || undefined,
          session_id: session.id,
          heat_record_id: data.id,
          predicted_ttt: session.prediction?.predicted_ttt,
          actual_ttt: session.validation.actualTtt ?? null,
          operator_comments: session.validation.operatorComments || "",
          recommendation_status: session.recommendationAcceptance,
          actual_recipe: session.recipe as unknown as Record<string, unknown>,
          validated_by: attr.validated_by,
          furnace_id: attr.furnace_id,
          supervisor_id: attr.supervisor_id,
          plant: attr.plant,
        });
      }
      // Only archive sessions the operator already closed with New Heat.
      // Validated rows must stay Validated so Heat History filters still find them.
      if (session.archived && !session.validation?.actualTtt) {
        try {
          await eafApi.heatArchive(data.id);
        } catch {
          /* ignore */
        }
      }
      recovered += 1;
    } catch (err) {
      console.error("[heat-history] recover failed for session", session.id, err);
    }
  }
  return recovered;
}
