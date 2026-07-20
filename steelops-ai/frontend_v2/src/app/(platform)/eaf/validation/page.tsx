"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { RecommendationAcceptanceBadge } from "@/features/eaf/components/recommendation-acceptance-panel";
import { TttComparisonBars } from "@/features/eaf/components/prediction-visuals";
import { eafApi } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafValidationPage() {
  const router = useRouter();
  const active = useCurrentHeatStore((s) => s.active);
  const updateValidation = useCurrentHeatStore((s) => s.updateValidation);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [form, setForm] = useState({
    heat_number: "",
    predicted_ttt: "",
    actual_ttt: "",
    operator_comments: "",
  });

  useEffect(() => {
    if (!active) return;
    const decisionNote = active.recommendationNotes?.trim() || "";
    const priorComments = active.validation?.operatorComments ?? "";
    setForm((f) => ({
      ...f,
      heat_number: active.heatNumber || f.heat_number,
      predicted_ttt: active.prediction?.predicted_ttt.toFixed(2) ?? f.predicted_ttt,
      operator_comments: priorComments || decisionNote || f.operator_comments,
      actual_ttt: active.validation?.actualTtt ?? f.actual_ttt,
    }));
  }, [active]);

  const recommendationAppliedLabel =
    active?.recommendationAcceptance === "Accepted"
      ? "Yes"
      : active?.recommendationAcceptance === "Modified"
        ? "Modified"
        : active?.recommendationAcceptance === "Rejected"
          ? "No"
          : "—";

  const optimizerUsedLabel = active?.optimizerV2
    ? "Research optimizer"
    : active?.optimizer
      ? "Production optimizer"
      : "—";

  const submit = async () => {
    setSaving(true);
    setSavedOk(false);
    setError(null);
    try {
      const applied =
        active?.recommendationAcceptance === "Accepted" ||
        active?.recommendationAcceptance === "Modified";
      await eafApi.validationCreate({
        heat_number: form.heat_number,
        predicted_ttt: parseFloat(form.predicted_ttt),
        actual_ttt: form.actual_ttt || "Pending",
        optimizer_used: optimizerUsedLabel,
        recommendation_applied: applied,
        operator_comments: form.operator_comments,
      });
      updateValidation({
        actualTtt: form.actual_ttt,
        optimizerUsed: optimizerUsedLabel,
        recommendationApplied: recommendationAppliedLabel,
        operatorComments: form.operator_comments,
      });
      const { syncHeatAfterValidation } = await import("@/lib/heat-history-sync");
      const record = await syncHeatAfterValidation();
      setSavedOk(true);
      const heatQ = encodeURIComponent(form.heat_number || active?.heatNumber || "");
      const recordQ = record?.id ? `&recordId=${encodeURIComponent(record.id)}` : "";
      router.push(`/eaf/reports?completed=1&heat=${heatQ}${recordQ}`);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to save validation record"));
    } finally {
      setSaving(false);
    }
  };

  const missingDecision = !!active?.optimizer && !active?.recommendationLocked;
  const histActual = active?.prediction?.explainability?.similar_heats?.length
    ? [...active.prediction.explainability.similar_heats].sort(
        (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.similarity_pct - a.similarity_pct
      )[0]?.actual_ttt
    : null;

  return (
    <PageContainer title="Validation" description="Enter actual TTT → save permanently → heat report">
      {!active?.prediction ? <EmptyHeatState className="mb-6" /> : null}
      <HeatWorkflowStrip active={active} currentPage="validate" className="mb-6" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RecommendationAcceptanceBadge />
        {missingDecision ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/eaf/optimizer">Back to Optimizer — lock decision first</Link>
          </Button>
        ) : null}
      </div>

      {active?.prediction ? (
        <div className="mb-6">
          <TttComparisonBars
            historicalActual={histActual ?? null}
            predicted={active.prediction.predicted_ttt}
            optimized={active.optimizer?.optimized_ttt ?? null}
          />
        </div>
      ) : null}

      {active?.recommendationAcceptance === "Modified" && active.modifiedRecipe ? (
        <SectionCard title="Modified recipe note" className="mb-6">
          <p className="text-sm text-muted-foreground">{active.recommendationNotes || "—"}</p>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Save production result"
        description="Heat number and prediction come from earlier steps — enter actual TTT only"
      >
        {!active?.prediction ? (
          <p className="text-sm text-muted-foreground">Predict a heat first.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Heat Number</Label>
              <Input className="mt-1" value={form.heat_number || "—"} readOnly disabled />
              <p className="mt-1 text-xs text-muted-foreground">From Prediction — not re-entered here</p>
            </div>
            <div>
              <Label>Predicted TTT (min)</Label>
              <Input className="mt-1" value={form.predicted_ttt} readOnly disabled />
            </div>
            <Field
              label="Actual TTT (min)"
              value={form.actual_ttt}
              onChange={(v) => setForm((f) => ({ ...f, actual_ttt: v }))}
              placeholder="Enter after heat completes"
            />
            <div>
              <Label>Decision (from Optimizer)</Label>
              <Input className="mt-1" value={recommendationAppliedLabel} readOnly disabled />
            </div>
            <div>
              <Label>Optimizer used</Label>
              <Input className="mt-1" value={optimizerUsedLabel} readOnly disabled />
            </div>
            <div className="md:col-span-2">
              <Field
                label="Floor comments (optional)"
                value={form.operator_comments}
                onChange={(v) => setForm((f) => ({ ...f, operator_comments: v }))}
              />
            </div>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={submit}
            disabled={
              saving ||
              !form.heat_number ||
              !form.predicted_ttt ||
              !form.actual_ttt.trim() ||
              missingDecision
            }
          >
            {saving ? "Saving…" : "Save & open heat report"}
          </Button>
          {savedOk ? (
            <span className="inline-flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Saved — redirecting…
            </span>
          ) : null}
        </div>
        {missingDecision ? (
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            Lock Accept / Modify / Reject on Optimizer before saving.
          </p>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
