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
import Link from "next/link";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { KpiStrip } from "@/components/layout/kpi-strip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CHART_SERIES,
  INDUSTRIAL_CHART,
  industrialAxisProps,
  industrialGridProps,
  industrialTooltipStyle,
} from "@/components/industrial/chart-theme";
import { eafApi, type HeatDashboardResponse } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

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
      title="Shift Analytics"
      description="Period HeatRecord statistics — not the live floor. Use Live Board for real-time status."
      actions={
        <>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
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
          <Button asChild size="sm" variant="outline">
            <Link href="/eaf/live-board">Live Board</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/eaf/heat-history">History</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href="/eaf/reports">Reports</Link>
          </Button>
        </>
      }
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading production statistics…</p> : null}

      {cards ? (
        <>
          <KpiStrip
            items={[
              { label: "Total Heats", value: cards.total_heats },
              { label: "Completed", value: cards.completed },
              { label: "Pending Validation", value: cards.pending_validation },
              { label: "Average cycle time", value: cards.average_ttt != null ? `${cards.average_ttt.toFixed(2)} min` : "—" },
            ]}
          />
          <KpiStrip
            items={[
              {
                label: "Average Error",
                value: cards.average_error != null ? `${cards.average_error.toFixed(2)} min` : "—",
              },
              {
                label: "Average Saving",
                value: cards.average_saving != null ? `${cards.average_saving.toFixed(2)} min` : "—",
                highlight: true,
              },
              {
                label: "Acceptance Rate",
                value: cards.acceptance_rate != null ? `${cards.acceptance_rate}%` : "—",
              },
              {
                label: "Reliability",
                value: cards.reliability != null ? cards.reliability.toFixed(1) : "—",
              },
            ]}
          />
          <KpiStrip
            items={[
              { label: "Prediction Confidence", value: cards.prediction_confidence ?? "—" },
              {
                label: "Optimization Success",
                value: cards.optimization_success != null ? `${cards.optimization_success}%` : "—",
              },
              {
                label: "Validation Rate",
                value: cards.validation_rate != null ? `${cards.validation_rate}%` : "—",
              },
              { label: "MAE (DB)", value: metrics.mae != null ? String(metrics.mae) : "—" },
            ]}
          />
        </>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <PieCard title="Shift distribution" data={pie?.shift_distribution ?? []} />
        <PieCard title="Recommendation acceptance" data={pie?.recommendation_acceptance ?? []} />
        <PieCard title="Confidence distribution" data={pie?.confidence_distribution ?? []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <TrendCard
          title="Average cycle time vs heat"
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

      <SectionCard title="Plant analytics" description="Averages from HeatRecord database">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <Mini label="Avg hot metal" value={fmt(averages.HM)} />
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
                  <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={industrialTooltipStyle} />
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
              <CartesianGrid {...industrialGridProps} />
              <XAxis dataKey="i" {...industrialAxisProps} />
              <YAxis {...industrialAxisProps} />
              <Tooltip contentStyle={industrialTooltipStyle} />
              <Line type="monotone" dataKey="value" stroke={INDUSTRIAL_CHART.primary} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </SectionCard>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-label">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function fmt(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : "—";
}
