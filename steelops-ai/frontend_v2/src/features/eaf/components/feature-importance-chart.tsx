"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ContributorItem } from "@/lib/api/eaf";
import { SectionCard } from "@/components/layout/section-card";
import { formatContributorLabel } from "@/lib/eaf-labels";

interface FeatureImportanceChartProps {
  contributors: ContributorItem[];
  title?: string;
}

export function FeatureImportanceChart({
  contributors,
  title = "Feature Importance",
}: FeatureImportanceChartProps) {
  const data = contributors
    .map((c) => ({
      name: formatContributorLabel(c.feature, c.display_name),
      importance: Math.abs(c.global_importance ?? c.contribution ?? 0),
    }))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10);

  return (
    <SectionCard title={title} description="Global importance and local SHAP contributions">
      <div className="h-72">
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="importance" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Importance" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Feature importance loads with model prediction data.
          </p>
        )}
      </div>
    </SectionCard>
  );
}
