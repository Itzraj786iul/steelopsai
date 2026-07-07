import { formatDurationMinutes } from "@/lib/date-utils";

export function PredictionDriftCard({
  predictedAtMin,
  actualAtMin,
}: {
  predictedAtMin: number;
  actualAtMin: number;
}) {
  const drift = actualAtMin - predictedAtMin;

  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
      <p className="text-label">Prediction drift</p>
      <p className="mt-2 text-xl font-semibold text-warning">
        {drift > 0 ? "+" : ""}
        {formatDurationMinutes(drift)}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">Live model tracking vs pre-heat target</p>
    </div>
  );
}
