"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, CircleDot } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { eafApi, type HeatRecord } from "@/lib/api/eaf";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api-client";

const LIFECYCLE = [
  "Draft",
  "Predicted",
  "Optimized",
  "Accepted",
  "Running",
  "Completed",
  "Validated",
  "Archived",
] as const;

export function HeatDetailsView({ heatNumber }: { heatNumber: string }) {
  const [heat, setHeat] = useState<HeatRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eafApi
      .heatGetByNumber(heatNumber)
      .then(({ data }) => setHeat(data))
      .catch(async (e: unknown) => {
        try {
          const { data } = await eafApi.heatGet(heatNumber);
          setHeat(data);
        } catch {
          setError(getApiErrorMessage(e, "Heat not found"));
        }
      })
      .finally(() => setLoading(false));
  }, [heatNumber]);

  if (loading) {
    return (
      <PageContainer title="Heat Details" description="Loading…">
        <p className="text-sm text-muted-foreground">Loading heat record…</p>
      </PageContainer>
    );
  }

  if (error || !heat) {
    return (
      <PageContainer title="Heat Details" description="Record not found">
        <p className="text-sm text-destructive">{error ?? "Heat not found"}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/eaf/heat-history">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Heat History
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const recipe = (heat.recipe_inputs || {}) as Record<string, number | string>;
  const currentIdx = Math.max(0, LIFECYCLE.indexOf(heat.status as (typeof LIFECYCLE)[number]));

  return (
    <PageContainer
      title={`Heat ${heat.heat_number}`}
      description={`${heat.date} ${heat.time} · Shift ${heat.shift} · ${heat.status}`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/eaf/heat-history">
            <ArrowLeft className="mr-2 h-4 w-4" /> History
          </Link>
        </Button>
        <Badge className={INDUSTRIAL_STATUS.prediction.className}>{heat.status}</Badge>
        {heat.recommendation_status ? <Badge variant="outline">{heat.recommendation_status}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Recipe inputs">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {(["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY"] as const).map((k) => (
                <Metric key={k} label={k} value={fmt(heat[k] ?? recipe[k])} />
              ))}
              <Metric label="Electrical Energy (kWh)" value={fmt(heat.Electrical_Energy_kWh ?? recipe.POWER)} />
              <Metric label="Power Restriction" value={String(heat.Power_Restriction ?? recipe.Power_Restriction ?? 0)} />
            </div>
          </SectionCard>

          <SectionCard title="Prediction" className={INDUSTRIAL_STATUS.prediction.className}>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <Metric label="Predicted TTT" value={fmt(heat.predicted_ttt, "min")} large />
              <Metric
                label="95% Interval"
                value={
                  heat.prediction_interval_low != null && heat.prediction_interval_high != null
                    ? `${heat.prediction_interval_low.toFixed(1)} – ${heat.prediction_interval_high.toFixed(1)}`
                    : "—"
                }
              />
              <Metric label="Confidence" value={heat.confidence ?? "—"} />
              <Metric
                label="Historical Similarity"
                value={heat.historical_similarity != null ? `${heat.historical_similarity.toFixed(0)}%` : "—"}
              />
              <Metric label="Risk" value={heat.risk_level ?? "—"} />
            </div>
          </SectionCard>

          <SectionCard title="Optimizer 20.2">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Optimized TTT" value={fmt(heat.optimized_ttt, "min")} />
              <Metric label="Expected Saving" value={fmt(heat.expected_saving, "min")} />
              <Metric label="Recommendation" value={heat.recommendation_status ?? "—"} />
            </div>
          </SectionCard>

          <SectionCard title="Optimizer V2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="V2 TTT" value={fmt(heat.v2_ttt, "min")} />
              <Metric label="V2 Saving" value={fmt(heat.v2_saving, "min")} />
            </div>
          </SectionCard>

          <SectionCard title="Hybrid trust">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Metric label="Reliability Index" value={fmt(heat.reliability_index)} />
              <Metric label="Physics" value={fmt(heat.physics_confidence)} />
              <Metric label="Industrial" value={fmt(heat.industrial_confidence)} />
              <Metric label="AI" value={fmt(heat.ai_confidence)} />
              <Metric label="Consensus" value={heat.consensus ?? "—"} />
            </div>
          </SectionCard>

          <SectionCard title="Validation">
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="Actual TTT" value={fmt(heat.actual_ttt, "min")} />
              <Metric label="Prediction Error" value={fmt(heat.prediction_error, "min")} />
              <Metric label="Comments" value={heat.operator_comments || "—"} />
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Lifecycle">
            <div className="flex flex-col gap-1">
              {LIFECYCLE.map((stage, index) => {
                const done = index < currentIdx;
                const current = index === currentIdx;
                return (
                  <div key={stage} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : current ? (
                      <CircleDot className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    <span
                      className={cn(
                        done && "text-emerald-700 dark:text-emerald-400",
                        current && "font-medium text-blue-700 dark:text-blue-400",
                        !done && !current && "text-muted-foreground"
                      )}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard title="Record metadata">
            <div className="space-y-2 text-sm">
              <Row label="Operator" value={heat.operator_name || "—"} />
              <Row label="Operator ID" value={heat.operator_id || "—"} />
              <Row label="Created" value={heat.created_at} />
              <Row label="Updated" value={heat.updated_at} />
              <Row label="Session" value={heat.session_id || "—"} />
            </div>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

function Metric({ label, value, large }: { label: string; value: string; large?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={large ? "font-mono text-2xl font-bold text-primary" : "font-mono text-lg font-semibold"}>{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-all text-right font-medium">{value}</span>
    </div>
  );
}

function fmt(v: unknown, unit?: string): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number") return unit ? `${v.toFixed(2)} ${unit}` : v.toFixed(2);
  return String(v);
}
