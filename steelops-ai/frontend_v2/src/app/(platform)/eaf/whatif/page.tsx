"use client";

import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Label } from "@/components/ui/label";
import { eafApi } from "@/lib/api/eaf";
import { formatVariableLabel } from "@/lib/eaf-labels";
import { useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { getApiErrorMessage } from "@/services/api-client";

const SLIDERS = [
  { key: "HM" as const, min: 40, max: 80, step: 0.1 },
  { key: "DRI" as const, min: 30, max: 75, step: 0.1 },
  { key: "POWER" as const, min: 25000, max: 42000, step: 50 },
  { key: "OXY" as const, min: 2500, max: 5000, step: 10 },
  { key: "CPC" as const, min: 200, max: 1200, step: 5 },
  { key: "Bucket" as const, min: 0, max: 35, step: 0.5 },
];

export default function EafWhatIfPage() {
  const { recipe, update } = useEafRecipe();
  const [pred, setPred] = useState<number | null>(null);
  const [tornado, setTornado] = useState<{ variable: string; low: number; high: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (r: typeof recipe) => {
    try {
      setError(null);
      const { data } = await eafApi.whatif(r);
      setPred(data.predicted_ttt);
      setTornado(
        data.tornado.map((t: { variable: string; low_delta: number; high_delta: number }) => ({
          variable: t.variable,
          low: t.low_delta,
          high: t.high_delta,
        }))
      );
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "What-if analysis unavailable"));
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(recipe), 350);
    return () => clearTimeout(t);
  }, [recipe, run]);

  const chartData = tornado.map((t) => ({
    name: formatVariableLabel(t.variable),
    low: t.low,
    high: t.high,
  }));

  return (
    <PageContainer title="What-if Analysis" description="Live sensitivity analysis — adjust variables and observe TTT response">
      <SectionCard title="Live Prediction">
        <p className="font-mono text-4xl font-bold text-primary">{pred?.toFixed(2) ?? "—"} min</p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>
      <SectionCard title="Adjust Variables" className="mt-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {SLIDERS.map(({ key, min, max, step }) => (
            <div key={key} className="space-y-2">
              <Label>
                {formatVariableLabel(key)}: {Number(recipe[key]).toFixed(key === "POWER" || key === "OXY" ? 0 : 1)}
              </Label>
              <input
                type="range"
                className="w-full accent-primary"
                min={min}
                max={max}
                step={step}
                value={recipe[key] as number}
                onChange={(e) => update(key, parseFloat(e.target.value))}
              />
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Tornado Sensitivity" className="mt-6">
        <div className="h-80">
          {chartData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="low" fill="#B83232" name="Decrease" />
                <Bar dataKey="high" fill="#1B7A3D" name="Increase" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Adjust sliders to compute sensitivity.
            </p>
          )}
        </div>
      </SectionCard>
    </PageContainer>
  );
}
