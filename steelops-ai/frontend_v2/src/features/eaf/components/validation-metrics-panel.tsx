"use client";

import { useMemo } from "react";

import { SectionCard } from "@/components/layout/section-card";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import {
  computeHeatValidationMetrics,
  computeSessionMaeFromStore,
} from "@/lib/validation-metrics";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

interface ValidationMetricsPanelProps {
  actualTtt: string;
}

export function ValidationMetricsPanel({ actualTtt }: ValidationMetricsPanelProps) {
  const active = useCurrentHeatStore((s) => s.active);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);

  const metrics = useMemo(() => {
    if (!active) return null;
    const withActual = {
      ...active,
      validation: { ...active.validation, actualTtt },
    };
    const heatMetrics = computeHeatValidationMetrics(withActual);
    const sessionMae = computeSessionMaeFromStore(withActual, sessionHistory);
    return { ...heatMetrics, sessionMae };
  }, [active, actualTtt, sessionHistory]);

  if (!active?.prediction || !actualTtt || actualTtt === "Pending") return null;

  const actual = parseFloat(actualTtt);
  if (!Number.isFinite(actual)) return null;

  const predicted = active.prediction.predicted_ttt;

  return (
    <SectionCard title="Validation Metrics" description="Calculated automatically when Actual TTT is entered">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Prediction" value={predicted.toFixed(1)} unit="min" variant="prediction" />
        <Metric label="Actual" value={actual.toFixed(1)} unit="min" variant="validated" />
        <Metric
          label="Absolute Error"
          value={metrics?.absoluteError?.toFixed(1) ?? "—"}
          unit="min"
        />
        <Metric
          label="Optimizer Saving"
          value={metrics?.optimizerImprovement?.toFixed(1) ?? "—"}
          unit="min"
          variant="validated"
        />
        <Metric
          label="Prediction Bias"
          value={
            metrics?.predictionBias != null
              ? `${metrics.predictionBias >= 0 ? "+" : ""}${metrics.predictionBias.toFixed(1)}`
              : "—"
          }
          unit="min"
        />
        <Metric
          label="Session MAE"
          value={metrics?.sessionMae?.toFixed(2) ?? "—"}
          unit="min"
        />
      </div>
    </SectionCard>
  );
}

function Metric({
  label,
  value,
  unit,
  variant,
}: {
  label: string;
  value: string;
  unit?: string;
  variant?: "prediction" | "validated";
}) {
  const statusClass =
    variant === "prediction"
      ? INDUSTRIAL_STATUS.prediction.className
      : variant === "validated"
        ? INDUSTRIAL_STATUS.validated.className
        : "";

  return (
    <div className={`rounded-lg border p-3 ${statusClass}`}>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-2xl font-bold">
        {value}
        {unit && value !== "—" ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}
