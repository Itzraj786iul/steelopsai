"use client";

import { useEffect, useState } from "react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EafKpiCard } from "@/features/eaf/components/eaf-kpi-card";
import { eafApi, type HeatDashboardResponse } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

const PIE_COLORS = ["#EA580C", "#1B7A3D", "#2563EB", "#D97706", "#64748B", "#B83232"];

export function ShiftDashboardView() {
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState<HeatDashboardResponse | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      eafApi.heatsDashboard({ period }),
      eafApi.heatsAnalytics({ period }),
      eafApi.heatsDailyReport().catch(() => null),
    ])
      .then(([dash, analyticsRes]) => {
        setData(dash.data);
        setAnalytics(analyticsRes.data as Record<string, unknown>);
      })
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load shift dashboard")))
      .finally(() => setLoading(false));
  }, [period]);

  const cards = data?.cards;
  const pie = data?.pie;
  const trends = data?.trends;
  const averages = (analytics?.averages || {}) as Record<string, number | null>;
  const metrics = (analytics?.validation_metrics || {}) as Record<string, number | null>;

  return (
    <PageContainer
      title="Shift Dashboard"
      description="Production statistics from the HeatRecord database — not session-only"
    >
      <div className="mb-4 flex items-center gap-3">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading production statistics…</p> : null}

      {cards ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <EafKpiCard title="Total Heats" value={String(cards.total_heats)} />
          <EafKpiCard title="Completed" value={String(cards.completed)} />
          <EafKpiCard title="Pending Validation" value={String(cards.pending_validation)} />
          <EafKpiCard title="Average TTT" value={cards.average_ttt != null ? `${cards.average_ttt.toFixed(2)} min` : "—"} />
          <EafKpiCard title="Average Error" value={cards.average_error != null ? `${cards.average_error.toFixed(2)} min` : "—"} />
          <EafKpiCard title="Average Saving" value={cards.average_saving != null ? `${cards.average_saving.toFixed(2)} min` : "—"} />
          <EafKpiCard title="Acceptance Rate" value={cards.acceptance_rate != null ? `${cards.acceptance_rate}%` : "—"} />
          <EafKpiCard title="Reliability" value={cards.reliability != null ? cards.reliability.toFixed(1) : "—"} />
          <EafKpiCard title="Prediction Confidence" value={cards.prediction_confidence ?? "—"} />
          <EafKpiCard title="Optimization Success" value={cards.optimization_success != null ? `${cards.optimization_success}%` : "—"} />
          <EafKpiCard title="Validation Rate" value={cards.validation_rate != null ? `${cards.validation_rate}%` : "—"} />
          <EafKpiCard title="MAE (DB)" value={metrics.mae != null ? String(metrics.mae) : "—"} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <PieCard title="Shift distribution" data={pie?.shift_distribution ?? []} />
        <PieCard title="Recommendation acceptance" data={pie?.recommendation_acceptance ?? []} />
        <PieCard title="Confidence distribution" data={pie?.confidence_distribution ?? []} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <TrendCard
          title="Average TTT vs Heat"
          data={(trends?.ttt_vs_heat ?? []).map((d, i) => ({
            i: i + 1,
            value: d.predicted_ttt ?? null,
            label: d.heat_number,
          }))}
        />
        <TrendCard
          title="Saving vs Heat"
          data={(trends?.saving_vs_heat ?? []).map((d, i) => ({
            i: i + 1,
            value: d.expected_saving ?? null,
            label: d.heat_number,
          }))}
        />
        <TrendCard
          title="Prediction Error vs Heat"
          data={(trends?.error_vs_heat ?? []).map((d, i) => ({
            i: i + 1,
            value: d.prediction_error ?? null,
            label: d.heat_number,
          }))}
        />
      </div>

      <SectionCard title="Plant analytics" className="mt-6" description="Averages from HeatRecord database">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Mini label="Avg HM" value={fmt(averages.HM)} />
          <Mini label="Avg DRI" value={fmt(averages.DRI)} />
          <Mini label="Avg Lime" value={fmt(averages.LIME)} />
          <Mini label="Avg Oxygen" value={fmt(averages.OXY)} />
          <Mini label="Avg Electrical Energy" value={fmt(averages.Electrical_Energy_kWh)} />
          <Mini label="Avg Charge" value={fmt(averages.charge)} />
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function PieCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <SectionCard title={title}>
      {!data.length ? (
        <p className="text-sm text-muted-foreground">No data for this period.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

function TrendCard({
  title,
  data,
}: {
  title: string;
  data: { i: number; value: number | null; label?: string }[];
}) {
  const chart = data.filter((d) => d.value != null);
  return (
    <SectionCard title={title}>
      {!chart.length ? (
        <p className="text-sm text-muted-foreground">No trend data yet.</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="i" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#EA580C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : "—";
}
