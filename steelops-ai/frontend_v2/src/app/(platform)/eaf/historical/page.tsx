"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { CurrentHeatBanner } from "@/features/eaf/components/current-heat-banner";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafHistorical } from "@/features/eaf/hooks/use-eaf-historical";
import { useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { assessCharge, historicalStatusLabel } from "@/lib/charge-validation";
import { formatVariableLabel } from "@/lib/eaf-labels";

export default function EafHistoricalPage() {
  const { recipe, update, charge } = useEafRecipe();
  const { data, loading, error, refresh } = useEafHistorical();
  const cachedPrediction = useCurrentHeatStore((s) => s.active?.prediction?.predicted_ttt ?? null);
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
    if (tone === "normal") return "text-green-600";
    if (tone === "caution") return "text-amber-600";
    return "text-orange-600";
  }, []);

  return (
    <PageContainer title="Historical Analysis" description="Compare current heat recipe against plant operating history">
      <CurrentHeatBanner />
      <div className="mt-4">
        <Button variant="outline" onClick={() => refresh(recipe)} disabled={loading}>
          {loading ? "Loading…" : "Load historical bands"}
        </Button>
      </div>
      <RecipeForm recipe={recipe} onChange={update} charge={charge} historicalVariables={vars} />

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SectionCard title="Current Recipe">
          <p className="font-mono text-3xl font-bold text-primary">{pred?.toFixed(2) ?? "—"} min</p>
          <p className="mt-1 text-sm text-muted-foreground">Predicted tap-to-tap</p>
        </SectionCard>
        <SectionCard title="Total Charge">
          <p className="font-mono text-3xl">{charge.toFixed(1)} t</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Historical P5–P95: {chargeAssessment.bounds.p5.toFixed(0)}–{chargeAssessment.bounds.p95.toFixed(0)} t
          </p>
        </SectionCard>
        <SectionCard title="Confidence">
          <p className="text-3xl font-semibold">{chargeAssessment.confidence}</p>
          <p className="mt-1 text-sm text-muted-foreground">Based on charge vs historical distribution</p>
        </SectionCard>
      </div>

      <SectionCard title="Operating Comparison" className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading historical bands…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 text-left">Variable</th>
                  <th>Current Recipe</th>
                  <th>Historical Median</th>
                  <th>P5</th>
                  <th>P95</th>
                  <th>Recommendation</th>
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
          Values outside the historical P5–P95 band are flagged for operator review — not blocked. Adjust burden or
          energy inputs toward the median when seeking stable cycle times.
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
                <ReferenceLine x={powerVar.median} stroke="#0B3D6B" strokeDasharray="4 4" label={{ value: "Median", position: "top" }} />
                <ReferenceLine x={powerVar.current} stroke="#B83232" label={{ value: "Current", position: "insideTopRight" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" opacity={0.55} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
