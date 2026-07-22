"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { ChartSkeleton } from "@/components/feedback/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { eafApi, type EafRecipe } from "@/lib/api/eaf";
import { PAGE_EXPLAINERS } from "@/lib/eaf-glossary";
import { formatVariableLabel } from "@/lib/eaf-labels";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

const SLIDERS = [
  { key: "HM" as const, min: 40, max: 80, step: 0.1 },
  { key: "DRI" as const, min: 30, max: 75, step: 0.1 },
  { key: "POWER" as const, min: 25000, max: 42000, step: 50 },
  { key: "OXY" as const, min: 2500, max: 5000, step: 10 },
  { key: "CPC" as const, min: 200, max: 1200, step: 5 },
  { key: "Bucket" as const, min: 0, max: 35, step: 0.5 },
];

export default function EafWhatIfPage() {
  const activeRecipe = useCurrentHeatStore((s) => s.active?.recipe);
  const setRecipe = useCurrentHeatStore((s) => s.setRecipe);
  const [workingCopy, setWorkingCopy] = useState<EafRecipe | null>(null);
  const [pred, setPred] = useState<number | null>(null);
  const [tornado, setTornado] = useState<{ variable: string; low: number; high: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (activeRecipe && !workingCopy) {
      setWorkingCopy({ ...activeRecipe });
    }
  }, [activeRecipe, workingCopy]);

  const run = useCallback(async (r: EafRecipe) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, []);

  const updateWorking = <K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => {
    setWorkingCopy((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const resetToCurrent = () => {
    if (activeRecipe) setWorkingCopy({ ...activeRecipe });
  };

  const applyToOptimizer = () => {
    if (workingCopy) {
      setRecipe(workingCopy);
      router.push("/eaf/optimizer");
    }
  };

  const chartData = tornado.map((t) => ({
    name: formatVariableLabel(t.variable),
    low: t.low,
    high: t.high,
  }));

  if (!activeRecipe) {
    return (
      <PageContainer
        density="operator"
        eyebrow="Operator tools"
        title="What-if explorer"
        description="Try alternate charge mixes after you have a predicted heat."
      >
        <EmptyHeatState />
      </PageContainer>
    );
  }

  const recipe = workingCopy ?? activeRecipe;

  return (
    <PageContainer
      density="operator"
      eyebrow="Operator tools"
      title="What-if explorer"
      description="Move a few sliders to see how cycle time might change — then apply to Optimize if useful."
    >
      <div className="operator-flow space-y-4 sm:space-y-5">
      <PageExplainer {...PAGE_EXPLAINERS.whatif} />
      <SectionCard tone="emphasis" title="Estimated cycle time" description="Working copy only — not saved until you apply">
        <p className="font-mono text-4xl font-bold text-prediction">{pred?.toFixed(1) ?? "—"} min</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="lg" onClick={() => run(recipe)} disabled={loading}>
            {loading ? "Running…" : "Recalculate cycle time"}
          </Button>
          <Button variant="outline" onClick={resetToCurrent}>
            Reset to current heat
          </Button>
          <Button variant="secondary" onClick={applyToOptimizer}>
            Apply to Optimize
          </Button>
        </div>
        {error ? <PageAlert tone="error" className="mt-3">{error}</PageAlert> : null}
        {loading ? <ChartSkeleton className="mt-4" /> : null}
      </SectionCard>
      <SectionCard tone="quiet" title="Adjust inputs" description="Drag sliders — ranges show what is usual at the plant">
        <div className="grid gap-4 sm:grid-cols-2">
          {SLIDERS.map(({ key, min, max, step }) => (
            <div key={key} className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-3">
              <Label className="leading-snug">
                <span className="block text-sm font-semibold">{formatVariableLabel(key)}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Now {Number(recipe[key]).toFixed(key === "POWER" || key === "OXY" ? 0 : 1)} · usual {min}–{max}
                </span>
              </Label>
              <input
                type="range"
                className="w-full accent-primary"
                min={min}
                max={max}
                step={step}
                value={recipe[key] as number}
                onChange={(e) => updateWorking(key, parseFloat(e.target.value))}
              />
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard tone="panel" title="What moves cycle time most?" description="After recalculate — bigger bars mean bigger impact">
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
              Click Recalculate cycle time to see sensitivity.
            </p>
          )}
        </div>
      </SectionCard>
      </div>
    </PageContainer>
  );
}
