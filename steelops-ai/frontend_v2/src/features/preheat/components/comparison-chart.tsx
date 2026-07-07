"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/layout/section-card";
import {
  INDUSTRIAL_CHART,
  industrialAxisProps,
  industrialGridProps,
  industrialTooltipStyle,
} from "@/components/industrial/chart-theme";

interface ComparisonChartProps {
  data: Array<{ metric: string; current: number; optimized: number }>;
}

export function ComparisonBarChart({ data }: ComparisonChartProps) {
  return (
    <SectionCard title="Material & performance comparison" animate={false}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid {...industrialGridProps} />
            <XAxis dataKey="metric" {...industrialAxisProps} />
            <YAxis {...industrialAxisProps} />
            <Tooltip contentStyle={industrialTooltipStyle} />
            <Legend />
            <Bar dataKey="current" fill={INDUSTRIAL_CHART.secondary} name="Planned" radius={[4, 4, 0, 0]} isAnimationActive />
            <Bar dataKey="optimized" fill={INDUSTRIAL_CHART.primary} name="Recommended" radius={[4, 4, 0, 0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function ComparisonRadarChart({ data }: ComparisonChartProps) {
  return (
    <SectionCard title="Radar comparison" animate={false}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke={INDUSTRIAL_CHART.grid} />
            <PolarAngleAxis dataKey="metric" {...industrialAxisProps} />
            <PolarRadiusAxis {...industrialAxisProps} />
            <Radar name="Planned" dataKey="current" stroke={INDUSTRIAL_CHART.secondary} fill={INDUSTRIAL_CHART.secondary} fillOpacity={0.25} isAnimationActive />
            <Radar name="Recommended" dataKey="optimized" stroke={INDUSTRIAL_CHART.primary} fill={INDUSTRIAL_CHART.primary} fillOpacity={0.25} isAnimationActive />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function TimelineComparisonChart({ baseline, optimized }: { baseline: number; optimized: number }) {
  const data = [
    { stage: "Baseline", minutes: baseline },
    { stage: "Optimized", minutes: optimized },
  ];

  return (
    <SectionCard title="Timeline comparison" animate={false}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid {...industrialGridProps} />
            <XAxis type="number" {...industrialAxisProps} />
            <YAxis type="category" dataKey="stage" {...industrialAxisProps} width={80} />
            <Tooltip contentStyle={industrialTooltipStyle} />
            <Bar dataKey="minutes" fill={INDUSTRIAL_CHART.primary} radius={[0, 4, 4, 0]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
