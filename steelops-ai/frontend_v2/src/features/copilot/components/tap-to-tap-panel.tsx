"use client";

import { memo } from "react";
import { Clock } from "lucide-react";

import { ConfidenceBadge } from "@/features/preheat/components/confidence-badge";
import type { TapToTapPrediction } from "@/types/preheat.types";
import { formatDurationMinutes } from "@/lib/date-utils";

interface TapToTapPanelProps {
  prediction: TapToTapPrediction;
}

export const TapToTapPanel = memo(function TapToTapPanel({ prediction }: TapToTapPanelProps) {
  const interval = prediction.prediction_interval;
  const drivers = prediction.top_drivers.slice(0, 5);

  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-elevation-sm">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <p className="text-label">Predicted Tap-to-Tap</p>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-3xl font-semibold tracking-tight">
            {formatDurationMinutes(prediction.predicted_ttt)}
          </p>
          {interval?.low_90 != null && interval?.high_90 != null ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Interval {interval.low_90.toFixed(1)}–{interval.high_90.toFixed(1)} min (90%)
            </p>
          ) : null}
        </div>
        <ConfidenceBadge tier={prediction.prediction_quality} score={prediction.confidence} />
      </div>

      {prediction.estimated_completion_minutes != null ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Estimated completion: {formatDurationMinutes(prediction.estimated_completion_minutes)}
        </p>
      ) : null}

      {drivers.length > 0 ? (
        <div className="mt-4">
          <p className="text-label mb-2">Top drivers</p>
          <ul className="space-y-1 text-sm">
            {drivers.map((d) => (
              <li key={d.feature} className="flex justify-between gap-2">
                <span>{d.label}</span>
                <span className="text-muted-foreground capitalize">{d.direction}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
});
