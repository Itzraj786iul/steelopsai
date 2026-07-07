import type { LiveHeatDetail } from "@/types/live.types";
import { formatDurationMinutes } from "@/lib/date-utils";

export function DeviationPanel({ detail, predictedAtMin }: { detail: LiveHeatDetail; predictedAtMin: number }) {
  const actualMin = detail.elapsed_seconds / 60;
  const drift = actualMin - predictedAtMin;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/15 p-4 text-sm">
      <p className="text-label">Deviation from prediction</p>
      <p className={`mt-2 text-2xl font-semibold ${drift > 0 ? "text-warning" : "text-success"}`}>
        {drift > 0 ? "+" : ""}
        {formatDurationMinutes(Math.abs(drift))}
      </p>
      <p className="mt-2 text-muted-foreground">
        Predicted {formatDurationMinutes(predictedAtMin)} · Actual {formatDurationMinutes(actualMin)}
      </p>
      <p className="mt-2">Updated ETA {formatDurationMinutes(Math.max(0, predictedAtMin - actualMin + predictedAtMin))}</p>
    </div>
  );
}
