"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertOctagon,
  CheckCircle2,
  MessageSquarePlus,
  Pause,
  Play,
  StickyNote,
} from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { AlertFeed } from "@/features/live/components/alert-feed";
import { CurrentStageCard } from "@/features/live/components/current-stage-card";
import { DeviationPanel } from "@/features/live/components/deviation-panel";
import { ExecutionSummaryPanel } from "@/features/live/components/execution-summary";
import { HeatClock } from "@/features/live/components/heat-clock";
import { LiveConnectionBadge } from "@/features/live/components/live-connection-badge";
import { LiveRecommendationPanel } from "@/features/live/components/live-recommendation-panel";
import { MaterialConsumption } from "@/features/live/components/material-consumption";
import { OperatorChecklist } from "@/features/live/components/operator-checklist";
import { PredictionComparison } from "@/features/live/components/prediction-comparison";
import { PredictionDriftCard } from "@/features/live/components/prediction-drift-card";
import { RealtimeChart } from "@/features/live/components/realtime-chart";
import { StageTimeline } from "@/features/live/components/stage-timeline";
import { useLiveActions, useLiveHeat } from "@/features/live/hooks/use-live-heat";
import { formatDurationMinutes } from "@/lib/date-utils";
import type { ExecutionSummary } from "@/types/live.types";
import { useDecisionModeStore } from "@/stores/decision-mode-store";
import { useCelebrationStore } from "@/stores/celebration-store";

export function LiveHeatWorkspace({ heatId }: { heatId: string }) {
  const router = useRouter();
  const { detail, timeline, predictedAtMin, preheatPkg, isLoading, isError, refresh } = useLiveHeat(heatId);
  const actions = useLiveActions(heatId, detail);
  const [note, setNote] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const focusMode = useDecisionModeStore((s) => s.focusMode);
  const triggerCelebration = useCelebrationStore((s) => s.trigger);

  const executionSummary = useMemo<ExecutionSummary | null>(() => {
    if (!detail || detail.status !== "COMPLETED") return null;
    const actualAtMin = detail.elapsed_seconds / 60;
    const predicted = predictedAtMin;
    return {
      predictedAtMin: predicted,
      actualAtMin,
      differenceMin: actualAtMin - predicted,
      minutesSaved: Math.max(0, predicted - actualAtMin),
      recipeUsed: detail.recipe,
      recommendationFollowed: detail.recommendations.some((rec) => rec.status === "ACCEPTED"),
      learningSummary: preheatPkg?.engineering_reasoning ?? "Execution captured for learning loop.",
      confidenceUpdate: `Confidence ${detail.prediction.f2_risk_band ?? detail.health_band} after completion.`,
      businessValueInr: preheatPkg?.business_value_inr ?? Math.max(0, predicted - actualAtMin) * 500,
    };
  }, [detail, predictedAtMin, preheatPkg]);

  useEffect(() => {
    if (executionSummary) {
      setShowSummary(true);
      if (executionSummary.minutesSaved > 0) {
        triggerCelebration("heat_completed", "Heat completed — learning captured");
      }
    }
  }, [executionSummary, triggerCelebration]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "p") actions.togglePause();
      if (event.key === "f") actions.finishStage();
      if (event.key === "e" && event.shiftKey) actions.triggerEmergency();
    },
    [actions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (isLoading && !detail) return <PageLoadingSkeleton />;
  if (isError || !detail) return <ErrorState variant="twin" message="Unable to load live heat." onRetry={refresh} />;

  const actualAtMin = detail.elapsed_seconds / 60;
  const remainingMin = Math.max(0, predictedAtMin - actualAtMin);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="glass-panel-strong sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-4 lg:px-8">
        <div>
          <p className="text-label">Control room · Live execution</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-display-sm">{detail.heat_number}</h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            ~{formatDurationMinutes(remainingMin)} remaining · Predicted finish {formatDurationMinutes(predictedAtMin)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LiveConnectionBadge />
          <ActionButton variant="outline" asChild>
            <Link href="/live">All heats</Link>
          </ActionButton>
          <ActionButton variant="outline" asChild>
            <Link href="/copilot">Copilot</Link>
          </ActionButton>
        </div>
      </header>

      <div className={`grid flex-1 gap-6 p-6 lg:p-8 ${focusMode ? "lg:grid-cols-1 max-w-3xl mx-auto w-full" : "lg:grid-cols-12"}`}>
        {!focusMode ? (
        <aside className="space-y-4 lg:col-span-3">
          <section className="glass-panel rounded-2xl p-5 shadow-elevation-sm">
            <p className="text-label">Heat information</p>
            <div className="mt-3 space-y-2 text-sm">
              <InfoRow label="Heat ID" value={detail.heat_number} />
              <InfoRow label="Operator" value={detail.operator_name ?? "Unassigned"} />
              <InfoRow label="Shift" value={detail.shift ?? "—"} />
              <InfoRow label="Target heat time" value={formatDurationMinutes(predictedAtMin)} />
              <InfoRow label="Predicted finish" value={formatDurationMinutes(predictedAtMin)} />
              <InfoRow label="Health" value={`${detail.health_band} (${detail.health_score.toFixed(0)})`} />
            </div>
            <HeatClock elapsedSeconds={detail.elapsed_seconds} predictedAtMin={predictedAtMin} status={detail.status} />
            <MaterialConsumption detail={detail} />
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton size="sm" variant="outline" onClick={actions.togglePause}>
                {actions.paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {actions.paused ? "Resume" : "Pause"}
              </ActionButton>
              <ActionButton size="sm" variant="destructive" onClick={actions.triggerEmergency}>
                <AlertOctagon className="h-4 w-4" />
                Emergency
              </ActionButton>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note..."
                className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <ActionButton
                size="icon"
                variant="outline"
                onClick={() => {
                  actions.appendNote(note);
                  setNote("");
                }}
              >
                <StickyNote className="h-4 w-4" />
              </ActionButton>
            </div>
          </section>
        </aside>
        ) : null}

        <motion.main initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`space-y-4 ${focusMode ? "" : "lg:col-span-5"}`}>
          <CurrentStageCard status={detail.status} />
          <HeatClock elapsedSeconds={detail.elapsed_seconds} predictedAtMin={predictedAtMin} status={detail.status} />
          {!focusMode ? (
          <>
          <StageTimeline events={timeline} status={detail.status} />
          <DeviationPanel detail={detail} predictedAtMin={predictedAtMin} />
          <PredictionDriftCard predictedAtMin={predictedAtMin} actualAtMin={actualAtMin} />
          <PredictionComparison detail={detail} predictedAtMin={predictedAtMin} />
          <div className="grid gap-4 xl:grid-cols-2">
            <RealtimeChart detail={detail} metric="power_kw" label="Power" color="#5FA8D3" />
            <RealtimeChart detail={detail} metric="F1_P" label="Phosphorus" color="#FF7A1A" />
            <RealtimeChart detail={detail} metric="oxygen_nm3" label="Oxygen" color="#7BC67E" />
            <RealtimeChart detail={detail} metric="health_score" label="Health" color="#C084FC" />
          </div>
          </>
          ) : null}
        </motion.main>

        <div className={focusMode ? "space-y-4" : "lg:col-span-4"}>
          <LiveRecommendationPanel detail={detail} />
          {!focusMode ? (
          <>
          <section className="glass-panel mt-4 rounded-2xl p-5">
            <p className="text-label mb-3">Alerts</p>
            <AlertFeed
              alerts={detail.alerts}
              onAcknowledge={(id) => actions.acknowledgeAlert.mutate(id)}
            />
          </section>
          <section className="mt-4 rounded-xl border border-border/80 bg-card/50 p-4">
            <p className="text-label mb-3">Operator checklist</p>
            <OperatorChecklist
              recommendations={detail.recommendations}
              onAccept={(recId) => actions.respondRecommendation.mutate({ recId, response: "ACCEPT" })}
            />
          </section>
          </>
          ) : (
          <section className="glass-panel rounded-2xl p-5">
            <p className="text-label mb-3">Checklist</p>
            <OperatorChecklist
              recommendations={detail.recommendations}
              onAccept={(recId) => actions.respondRecommendation.mutate({ recId, response: "ACCEPT" })}
            />
          </section>
          )}
        </div>
      </div>

      <footer className="sticky bottom-0 z-20 border-t border-border/60 glass-panel-strong px-6 py-4 backdrop-blur-xl">
        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => actions.finishStage()}>
            <CheckCircle2 className="h-4 w-4" />
            Finish Stage
          </ActionButton>
          <ActionButton variant="secondary" onClick={() => actions.finishHeat()}>
            Finish Heat
          </ActionButton>
          <ActionButton variant="outline" onClick={() => router.push("/copilot")}>
            <MessageSquarePlus className="h-4 w-4" />
            Back to Copilot
          </ActionButton>
        </div>
      </footer>

      {showSummary && executionSummary ? (
        <ExecutionSummaryPanel summary={executionSummary} onClose={() => setShowSummary(false)} />
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
  