"use client";

import { memo } from "react";
import dynamic from "next/dynamic";

import { chartSeries } from "@/features/live/utils/live-utils";
import type { LiveHeatDetail } from "@/types/live.types";

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });

interface RealtimeChartProps {
  detail: LiveHeatDetail;
  metric: "power_kw" | "F1_P" | "oxygen_nm3" | "health_score";
  label: string;
  color?: string;
}

export const RealtimeChart = memo(function RealtimeChart({
  detail,
  metric,
  label,
  color = "#FF7A1A",
}: RealtimeChartProps) {
  const data = chartSeries(detail.metrics_history[metric], label);

  return (
    <div className="rounded-xl border border-border/70 bg-card/50 p-4">
      <p className="text-label mb-3">{label}</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" hide />
            <YAxis stroke="hsl(var(--muted-foreground))" width={40} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey={label} stroke={color} strokeWidth={2} dot={false} isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
