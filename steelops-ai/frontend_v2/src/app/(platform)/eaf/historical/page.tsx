"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { KpiStrip } from "@/components/layout/kpi-strip";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafHistorical } from "@/features/eaf/hooks/use-eaf-historical";
import { useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { assessCharge, historicalStatusLabel } from "@/lib/charge-validation";
import { PAGE_EXPLAINERS } from "@/lib/eaf-glossary";
import { formatVariableLabel } from "@/lib/eaf-labels";

export default function EafHistoricalPage() {
  const { recipe, update, charge } = useEafRecipe();
  const { data, loading, error, refresh } = useEafHistorical();
  const cachedPrediction = useCurrentHeatStore((s) => s.active?.prediction?.predicted_ttt ?? null);
  const hasActiveHeat = useCurrentHeatStore((s) => s.hasActiveHeat());
  const [pred, setPred] = useState<number | null>(cachedPrediction);

  useEffect(() => {
    setPred(cachedPrediction);
  }, [cachedPrediction]);

  const vars = data?.variables ?? [];
  const chargeAssessment = assessCharge(charge, vars);
  const powerVar = vars.find((v) => v.variable === "POWER");

  const chartData = useMemo(() => {
    const distribution = data?.distribution?.POWER ?? data?.distribution?.HM ?? [];
    if (!distribution.length) return [];
    const sorted = [...distribution].sort((a, b) => a - b);
    const binCount = 24;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const width = Math.max((max - min) / binCount, 1);
    const bins = Array.from({ length: binCount }, (_, i) => ({
      midpoint: min + (i + 0.5) * width,
      count: 0,
    }));
    sorted.forEach((val) => {
      const idx = Math.min(binCount - 1, Math.floor((val - min) / width));
      bins[idx].count += 1;
    });
    return bins;
  }, [data?.distribution]);

  const statusToneClass = useCallback((tone: "normal" | "caution" | "outside") => {
    if (tone === "normal") return "text-success";
    if (tone === "caution") return "text-warning";
    return "text-destructive";
  }, []);

  return (
    <PageContainer
      title="Historical comparison"
      description="Compare your recipe to what this plant usually runs — common low / typical / high bands"
    >
      <PageExplainer {...PAGE_EXPLAINERS.historical} />
      {!hasActiveHeat ? <EmptyHeatState className="mb-6" /> : null}
      <div className="mt-2">
        <Button variant="outline" onClick={() => refresh(recipe)} disabled={loading}>
          {loading ? "Loading…" : "Load plant bands"}
        </Button>
      </div>
      <RecipeForm recipe={recipe} onChange={update} charge={charge} historicalVariables={vars} />

      {error ? <PageAlert tone="error" className="mt-4">{error}</PageAlert> : null}

      <KpiStrip
        className="mt-6"
        columns={3}
        items={[
          {
            label: "Predicted cycle time",
            value: pred != null ? `${pred.toFixed(1)} min` : "—",
            highlight: true,
          },
          {
            label: "Total charge",
            value: `${charge.toFixed(1)} t`,
            delta: `Usual ~${chargeAssessment.bounds.p5.toFixed(0)}–${chargeAssessment.bounds.p95.toFixed(0)} t`,
          },
          {
            label: "Confidence",
            value: chargeAssessment.confidence,
            delta: "From charge vs plant history",
          },
        ]}
      />

      <SectionCard title="Operating comparison" className="mt-6" description="Flagged for review only — never blocked">
        {loading ? (
          <LoadingSkeleton rows={6} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">Variable</th>
                  <th>Current</th>
                  <th>Typical (median)</th>
                  <th>Low end</th>
                  <th>High end</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vars.map((v) => {
                  const status = historicalStatusLabel(v.current, v.p5, v.p95);
                  return (
                    <tr key={v.variable} className="border-b border-border/50">
                      <td className="py-2 font-medium">{formatVariableLabel(v.variable)}</td>
                      <td className="font-mono">{v.current.toFixed(2)}</td>
                      <td className="font-mono">{v.median.toFixed(2)}</td>
                      <td className="font-mono">{v.p5.toFixed(2)}</td>
                      <td className="font-mono">{v.p95.toFixed(2)}</td>
                      <td>
                        <span className={statusToneClass(status.tone)}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-sm text-muted-foreground">
          Values outside the usual plant band are flagged for review — not blocked. Move toward the typical
          (median) value when you want more stable cycle times.
        </p>
      </SectionCard>

      {chartData.length > 0 && powerVar ? (
        <SectionCard title="Electrical Energy Distribution" className="mt-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="midpoint" tick={{ fontSize: 11 }} tickFormatter={(v) => `${Number(v).toFixed(0)}`} />
                <YAxis />
                <Tooltip formatter={(value) => [value ?? 0, "Heats"]} labelFormatter={(l) => `${Number(l).toFixed(0)} kWh`} />
                <ReferenceArea x1={powerVar.p5} x2={powerVar.p95} fill="hsl(var(--primary))" fillOpacity={0.08} />
                <ReferenceLine x={powerVar.median} stroke="hsl(var(--secondary))" strokeDasharray="4 4" label={{ value: "Typical", position: "top" }} />
                <ReferenceLine x={powerVar.current} stroke="hsl(var(--destructive))" label={{ value: "Current", position: "insideTopRight" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.55} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
