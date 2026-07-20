"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { TermTip } from "@/components/feedback/term-tip";
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
import { PAGE_EXPLAINERS, TTT } from "@/lib/eaf-glossary";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafValidationPage() {
  const router = useRouter();
  const active = useCurrentHeatStore((s) => s.active);
  const updateValidation = useCurrentHeatStore((s) => s.updateValidation);
  const setHeatNumber = useCurrentHeatStore((s) => s.setHeatNumber);
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

  /** Allow typing heat # only when Prediction left it blank. */
  const heatNumberMissing = !(active?.heatNumber?.trim() || form.heat_number.trim());
  const heatNumberEditable = !active?.heatNumber?.trim();

  const onHeatNumberChange = (value: string) => {
    setForm((f) => ({ ...f, heat_number: value }));
    setHeatNumber(value);
  };

  const submit = async () => {
    const heatNumber = form.heat_number.trim() || active?.heatNumber?.trim() || "";
    if (!heatNumber) {
      setError("Enter the heat number before saving.");
      return;
    }
    if (!form.actual_ttt.trim()) {
      setError("Enter the actual cycle time (minutes) before saving.");
      return;
    }
    setSaving(true);
    setSavedOk(false);
    setError(null);
    try {
      if (heatNumber !== active?.heatNumber) {
        setHeatNumber(heatNumber);
      }
      const applied =
        active?.recommendationAcceptance === "Accepted" ||
        active?.recommendationAcceptance === "Modified";
      await eafApi.validationCreate({
        heat_number: heatNumber,
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
      const heatQ = encodeURIComponent(heatNumber);
      const recordQ = record?.id ? `&recordId=${encodeURIComponent(record.id)}` : "";
      router.push(`/eaf/reports?completed=1&heat=${heatQ}${recordQ}`);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to save validation record"));
    } finally {
      setSaving(false);
    }
  };

  const missingDecision = !!active?.optimizer && !active?.recommendationLocked;
  const canSave =
    !!form.heat_number.trim() &&
    !!form.predicted_ttt &&
    !!form.actual_ttt.trim() &&
    !missingDecision &&
    !saving;

  const histActual = active?.prediction?.explainability?.similar_heats?.length
    ? [...active.prediction.explainability.similar_heats].sort(
        (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.similarity_pct - a.similarity_pct
      )[0]?.actual_ttt
    : null;

  return (
    <PageContainer
      title="Record the real result"
      description={
        <>
          After the furnace finishes, enter the actual <TermTip term={TTT} /> so the plant can compare prediction vs reality.
        </>
      }
      actions={
        missingDecision ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/eaf/optimizer">Lock decision on Optimizer</Link>
          </Button>
        ) : (
          <RecommendationAcceptanceBadge />
        )
      }
    >
      {!active?.prediction ? <EmptyHeatState /> : null}
      <HeatWorkflowStrip active={active} currentPage="validate" />
      <PageExplainer {...PAGE_EXPLAINERS.validation} />

      {missingDecision ? (
        <PageAlert tone="warning" title="Decision not locked">
          Accept, Modify, or Reject the recommendation on Optimizer before saving validation.
        </PageAlert>
      ) : null}

      {active?.prediction ? (
        <TttComparisonBars
          historicalActual={histActual ?? null}
          predicted={active.prediction.predicted_ttt}
          optimized={active.optimizer?.optimized_ttt ?? null}
        />
      ) : null}

      {active?.recommendationAcceptance === "Modified" && active.modifiedRecipe ? (
        <SectionCard title="What you changed">
          <p className="text-sm text-muted-foreground">{active.recommendationNotes || "—"}</p>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Save production result"
        description={
          heatNumberEditable
            ? "Heat number was missing earlier — enter it here, then the actual cycle time in minutes."
            : "Heat number and prediction are already filled — you mainly enter the actual cycle time from the floor."
        }
      >
        {!active?.prediction ? (
          <p className="text-sm text-muted-foreground">Predict a heat first.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="leading-snug">
                <span className="block text-sm font-medium">
                  Heat number
                  {heatNumberEditable ? <span className="text-destructive"> *</span> : null}
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {heatNumberEditable ? "Required — enter plant batch ID" : "From Prediction — read only"}
                </span>
              </Label>
              {heatNumberEditable ? (
                <>
                  <Input
                    className="mt-1"
                    value={form.heat_number}
                    onChange={(e) => onHeatNumberChange(e.target.value)}
                    placeholder="e.g. 4618213"
                  />
                  <p className="mt-1 text-xs text-warning">
                    Required — not set during Prediction. Enter it to enable Save.
                  </p>
                </>
              ) : (
                <>
                  <Input className="mt-1" value={form.heat_number} readOnly disabled />
                  <p className="mt-1 text-xs text-muted-foreground">From Prediction — not re-entered here</p>
                </>
              )}
            </div>
            <div>
              <Label className="leading-snug">
                <span className="block">Predicted cycle time (min)</span>
                <span className="text-[11px] font-normal text-muted-foreground">From the model — read only</span>
              </Label>
              <Input className="mt-1" value={form.predicted_ttt} readOnly disabled />
            </div>
            <Field
              label="Actual cycle time (min)"
              hint="Shop-floor stopwatch / MES value after tap. Typical heats: ~50–80 min."
              value={form.actual_ttt}
              onChange={(v) => setForm((f) => ({ ...f, actual_ttt: v }))}
              placeholder="e.g. 62.5"
              required
            />
            <div>
              <Label className="leading-snug">
                <span className="block text-sm font-medium">Recommendation decision</span>
                <span className="text-[11px] font-normal text-muted-foreground">Locked on Optimize</span>
              </Label>
              <Input className="mt-1" value={recommendationAppliedLabel} readOnly disabled />
            </div>
            <div>
              <Label className="leading-snug">
                <span className="block text-sm font-medium">Which optimizer ran</span>
                <span className="text-[11px] font-normal text-muted-foreground">Production or research path</span>
              </Label>
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
          <Button onClick={submit} disabled={!canSave}>
            {saving ? "Saving…" : "Save & open heat report"}
          </Button>
          {savedOk ? (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Saved — redirecting…
            </span>
          ) : null}
        </div>
        {!canSave && active?.prediction ? (
          <p className="mt-3 text-sm text-warning">
            {missingDecision
              ? "Lock Accept / Modify / Reject on Optimizer before saving."
              : heatNumberMissing
                ? "Enter heat number to enable Save."
                : !form.actual_ttt.trim()
                  ? "Enter actual cycle time (minutes) to enable Save."
                  : null}
          </p>
        ) : null}
        {error ? <PageAlert tone="error" className="mt-4">{error}</PageAlert> : null}
      </SectionCard>
    </PageContainer>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <Label className="leading-snug">
        <span className="block">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {hint ? <span className="text-[11px] font-normal text-muted-foreground">{hint}</span> : null}
      </Label>
      <Input className="mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

