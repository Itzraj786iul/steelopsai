"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { eafApi, type ReliabilitySummary } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

export default function EafReliabilityPage() {
  const [data, setData] = useState<ReliabilitySummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eafApi
      .reliabilitySummary()
      .then(({ data: res }) => setData(res))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load reliability dashboard")));
  }, []);

  return (
    <PageContainer title="Reliability Dashboard" description="Aggregated Phase 32 trust metrics and validation trends">
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Avg Reliability Index" value={fmt(data?.avg_reliability_index)} suffix="/ 100" />
        <Kpi title="Avg AI Confidence" value={fmt(data?.avg_ai_confidence)} suffix="/ 100" />
        <Kpi title="Avg Physics Confidence" value={fmt(data?.avg_physics_confidence)} suffix="/ 100" />
        <Kpi title="Avg Industrial Confidence" value={fmt(data?.avg_industrial_confidence)} suffix="/ 100" />
        <Kpi title="Avg Historical Similarity" value={fmt(data?.avg_historical_similarity)} suffix="%" />
        <Kpi title="Recommendation Acceptance" value={fmt(data?.recommendation_acceptance_rate_pct)} suffix="%" />
        <Kpi title="Optimizer Success Rate" value={fmt(data?.optimizer_success_rate_pct)} suffix="%" />
        <Kpi title="Validation MAE" value={data?.validation_metrics?.mae ?? "—"} suffix=" min" />
      </div>

      <SectionCard title="Prediction error trend" className="mt-6">
        {!data?.prediction_error_trend?.length ? (
          <p className="text-sm text-muted-foreground">
            Import actual TTT on the Validation page to populate error trends.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Heat</th>
                  <th>Date</th>
                  <th>|Error| (min)</th>
                  <th>Signed error</th>
                </tr>
              </thead>
              <tbody>
                {data.prediction_error_trend.map((row) => (
                  <tr key={`${row.heat_number}-${row.recorded_at}`} className="border-b border-border/50">
                    <td className="py-2">{row.heat_number}</td>
                    <td>{row.recorded_at?.slice(0, 10)}</td>
                    <td className="font-mono">{row.error_min.toFixed(2)}</td>
                    <td className="font-mono">{row.signed_error_min.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function fmt(v: number | null | undefined) {
  return v != null ? v.toFixed(1) : "—";
}

function Kpi({ title, value, suffix }: { title: string; value: string | number; suffix?: string }) {
  return (
    <SectionCard title={title}>
      <p className="font-mono text-2xl font-semibold">
        {value}
        {suffix && value !== "—" ? <span className="text-base font-normal text-muted-foreground"> {suffix}</span> : null}
      </p>
    </SectionCard>
  );
}
