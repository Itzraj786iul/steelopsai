"use client";

import { useCallback, useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { HeatLifecycleTimeline } from "@/features/eaf/components/heat-lifecycle-timeline";
import { RecommendationAcceptanceBadge } from "@/features/eaf/components/recommendation-acceptance-panel";
import { ValidationMetricsPanel } from "@/features/eaf/components/validation-metrics-panel";
import { eafApi, type ValidationEntry, type ValidationListResponse } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafValidationPage() {
  const active = useCurrentHeatStore((s) => s.active);
  const updateValidation = useCurrentHeatStore((s) => s.updateValidation);
  const [data, setData] = useState<ValidationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    heat_number: "",
    predicted_ttt: "",
    actual_ttt: "",
    optimizer_used: "Phase 20.2",
    recommendation_applied: "No",
    operator_comments: "",
  });

  useEffect(() => {
    if (!active) return;
    setForm((f) => ({
      ...f,
      heat_number: active.heatNumber || f.heat_number,
      predicted_ttt: active.prediction?.predicted_ttt.toFixed(2) ?? f.predicted_ttt,
      optimizer_used: active.optimizerV2 ? "Phase 31 V2" : active.optimizer ? "Phase 20.2" : f.optimizer_used,
      operator_comments: active.validation?.operatorComments ?? f.operator_comments,
      actual_ttt: active.validation?.actualTtt ?? f.actual_ttt,
      recommendation_applied:
        active.recommendationAcceptance === "Accepted"
          ? "Yes"
          : active.recommendationAcceptance
            ? "No"
            : active.validation?.recommendationApplied ?? f.recommendation_applied,
    }));
  }, [active]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await eafApi.validationList();
      setData(res);
      setError(null);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load validation history"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setSaving(true);
    try {
      await eafApi.validationCreate({
        heat_number: form.heat_number,
        predicted_ttt: parseFloat(form.predicted_ttt),
        actual_ttt: form.actual_ttt || "Pending",
        optimizer_used: form.optimizer_used,
        recommendation_applied: form.recommendation_applied === "Yes",
        operator_comments: form.operator_comments,
      });
      updateValidation({
        actualTtt: form.actual_ttt,
        optimizerUsed: form.optimizer_used,
        recommendationApplied: form.recommendation_applied,
        operatorComments: form.operator_comments,
      });
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to save validation record"));
    } finally {
      setSaving(false);
    }
  };

  const metrics = data?.metrics;

  return (
    <PageContainer title="Validation" description="Plant validation linked to the current heat">
      {!active?.prediction ? <EmptyHeatState className="mb-6" /> : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <RecommendationAcceptanceBadge />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <MetricCard label="Records" value={metrics?.count ?? 0} />
        <MetricCard label="MAE (min)" value={metrics?.mae ?? "—"} />
        <MetricCard label="RMSE (min)" value={metrics?.rmse ?? "—"} />
        <MetricCard label="Bias (min)" value={metrics?.bias ?? "—"} />
      </div>

      <ValidationMetricsPanel actualTtt={form.actual_ttt} />

      <SectionCard title="Record production result" className="mt-6">
        {!active?.prediction ? (
          <p className="text-sm text-muted-foreground">Predict a heat first to pre-fill validation fields.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Heat Number" value={form.heat_number} onChange={(v) => setForm((f) => ({ ...f, heat_number: v }))} />
            <Field label="Predicted TTT (min)" value={form.predicted_ttt} onChange={(v) => setForm((f) => ({ ...f, predicted_ttt: v }))} />
            <Field label="Actual TTT (min)" value={form.actual_ttt} onChange={(v) => setForm((f) => ({ ...f, actual_ttt: v }))} placeholder="Pending if unknown" />
            <Field label="Optimizer Used" value={form.optimizer_used} onChange={(v) => setForm((f) => ({ ...f, optimizer_used: v }))} />
            <div>
              <Label>Recommendation Applied?</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={form.recommendation_applied}
                onChange={(e) => setForm((f) => ({ ...f, recommendation_applied: e.target.value }))}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>
            <Field label="Operator Comments" value={form.operator_comments} onChange={(v) => setForm((f) => ({ ...f, operator_comments: v }))} />
          </div>
        )}
        <Button className="mt-4" onClick={submit} disabled={saving || !form.heat_number || !form.predicted_ttt}>
          {saving ? "Saving…" : "Save validation record"}
        </Button>
      </SectionCard>

      {active ? <HeatLifecycleTimeline active={active} /> : null}

      <SectionCard title="Validation history" className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ValidationTable entries={data?.entries ?? []} />
        )}
      </SectionCard>
      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}
    </PageContainer>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <SectionCard title={label}>
      <p className="font-mono text-2xl font-semibold">{value}</p>
    </SectionCard>
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

function ValidationTable({ entries }: { entries: ValidationEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted-foreground">No validation records yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Heat</th>
            <th>Predicted</th>
            <th>Actual</th>
            <th>Diff</th>
            <th>Optimizer</th>
            <th>Applied</th>
            <th>Comments</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {[...entries].reverse().map((e) => (
            <tr key={`${e.heat_number}-${e.recorded_at}`} className="border-b border-border/50">
              <td className="py-2 font-medium">{e.heat_number}</td>
              <td className="font-mono">{e.predicted_ttt.toFixed(2)}</td>
              <td className="font-mono">{typeof e.actual_ttt === "number" ? e.actual_ttt.toFixed(2) : e.actual_ttt ?? "—"}</td>
              <td className="font-mono">{e.difference != null ? e.difference.toFixed(2) : "—"}</td>
              <td>{e.optimizer_used}</td>
              <td>{String(e.recommendation_applied)}</td>
              <td className="max-w-xs truncate">{e.operator_comments}</td>
              <td className="text-xs text-muted-foreground">{e.recorded_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
