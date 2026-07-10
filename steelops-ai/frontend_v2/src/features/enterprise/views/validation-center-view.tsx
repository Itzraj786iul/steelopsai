"use client";

import { useMemo } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ValidationMetricsPanel } from "@/features/eaf/components/validation-metrics-panel";
import { RecommendationAcceptanceBadge } from "@/features/eaf/components/recommendation-acceptance-panel";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { computeSessionMaeFromStore } from "@/lib/validation-metrics";
import { getAllHeats } from "@/lib/shift-operations";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

function parseActual(v: string | undefined): number | null {
  if (!v || v === "Pending") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function ValidationCenterView() {
  const active = useCurrentHeatStore((s) => s.active);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);
  const actualTtt = active?.validation?.actualTtt ?? "";

  const trend = useMemo(() => {
    return getAllHeats(active, sessionHistory)
      .filter((h) => h.prediction && parseActual(h.validation?.actualTtt) != null)
      .slice(0, 15)
      .reverse()
      .map((h, i) => {
        const pred = h.prediction!.predicted_ttt;
        const actual = parseActual(h.validation?.actualTtt)!;
        const err = Math.abs(pred - actual);
        return { index: i + 1, heat: h.heatNumber || `#${i + 1}`, error: err, bias: pred - actual };
      });
  }, [active, sessionHistory]);

  const sessionMae = computeSessionMaeFromStore(active, sessionHistory);
  const rmse = useMemo(() => {
    const errs = trend.map((t) => t.error);
    if (!errs.length) return null;
    return Math.sqrt(errs.reduce((a, b) => a + b * b, 0) / errs.length);
  }, [trend]);

  if (!active?.prediction) {
    return (
      <PageContainer title="Plant Validation Center" description="Dedicated validation workspace">
        <EmptyHeatState />
      </PageContainer>
    );
  }

  const predicted = active.prediction.predicted_ttt;
  const actual = parseActual(actualTtt);
  const absErr = actual != null ? Math.abs(predicted - actual) : null;
  const bias = actual != null ? predicted - actual : null;

  return (
    <PageContainer title="Plant Validation Center" description="Predicted vs actual TTT — session metrics and trends">
      <RecommendationAcceptanceBadge />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Predicted TTT" value={`${predicted.toFixed(2)} min`} />
        <Metric label="Actual TTT" value={actual != null ? `${actual.toFixed(2)} min` : "Pending"} />
        <Metric label="Absolute Error" value={absErr != null ? `${absErr.toFixed(2)} min` : "—"} />
        <Metric label="Bias" value={bias != null ? `${bias >= 0 ? "+" : ""}${bias.toFixed(2)} min` : "—"} />
        <Metric label="Optimizer Saving" value={active.optimizer ? `${active.optimizer.improvement_min.toFixed(2)} min` : "—"} />
        <Metric label="Operator Decision" value={active.recommendationAcceptance ?? "—"} />
        <Metric label="Validation Status" value={active.validation?.validatedAt ? "Validated" : "Pending"} />
        <Metric label="Session MAE" value={sessionMae != null ? `${sessionMae.toFixed(2)} min` : "—"} />
        <Metric label="Session RMSE" value={rmse != null ? `${rmse.toFixed(2)} min` : "—"} />
      </div>

      <ValidationMetricsPanel actualTtt={actualTtt} />

      <SectionCard title="Validation Error Trend" className="mt-6">
        {trend.length ? (
          <div className="h-56" role="img" aria-label="Validation error trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="error" stroke="#2563eb" name="Abs Error (min)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Enter actual TTT on the Validation page to build trend data.</p>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <SectionCard title={label}>
      <p className="font-mono text-xl font-bold">{value}</p>
    </SectionCard>
  );
}
