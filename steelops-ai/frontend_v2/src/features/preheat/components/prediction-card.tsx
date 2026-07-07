import { SectionCard } from "@/components/layout/section-card";
import { ConfidenceBadge } from "@/features/preheat/components/confidence-badge";
import { formatDurationMinutes } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";

interface PredictionCardProps {
  predictedAt: number;
  targetAt: number;
  minutesToSave: number;
  confidenceTier: string;
  confidenceScore: number;
  greenPct?: number;
}

export function PredictionCard({
  predictedAt,
  targetAt,
  minutesToSave,
  confidenceTier,
  confidenceScore,
  greenPct,
}: PredictionCardProps) {
  return (
    <SectionCard title="Prediction" description="Current forecast vs recoverable target">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Predicted heat time" value={formatDurationMinutes(predictedAt)} highlight />
        <Metric label="Target heat time" value={formatDurationMinutes(targetAt)} />
        <Metric label="Minutes to recover" value={formatDurationMinutes(minutesToSave)} accent />
        <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
          <p className="text-label">Confidence</p>
          <div className="mt-2">
            <ConfidenceBadge tier={confidenceTier} score={confidenceScore} />
          </div>
          {typeof greenPct === "number" ? (
            <p className="mt-3 text-sm text-muted-foreground">GREEN probability {greenPct.toFixed(1)}%</p>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

function Metric({
  label,
  value,
  highlight,
  accent,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-card p-4">
      <p className="text-label">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${
          accent ? "text-accent" : highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function SavingCard({ minutes, valueInr }: { minutes: number; valueInr: number }) {
  return (
    <SectionCard title="Potential saving" description="Recoverable time and business value today">
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Minutes recoverable" value={formatDurationMinutes(minutes)} accent />
        <Metric label="Business value" value={formatCurrency(valueInr)} highlight />
      </div>
    </SectionCard>
  );
}

export function BusinessValueCard({ valueInr, minutes }: { valueInr: number; minutes: number }) {
  return <SavingCard minutes={minutes} valueInr={valueInr} />;
}
