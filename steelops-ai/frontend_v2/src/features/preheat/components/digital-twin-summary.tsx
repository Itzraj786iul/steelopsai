import { SectionCard } from "@/components/layout/section-card";
import type { DigitalTwinComparison } from "@/types/preheat.types";
import { formatDurationMinutes } from "@/lib/date-utils";

export function DigitalTwinSummary({ comparison }: { comparison: DigitalTwinComparison }) {
  return (
    <SectionCard title="Digital twin summary" description="Virtual heat comparison">
      <div className="grid gap-4 lg:grid-cols-2">
        <TwinColumn
          title="Current recipe"
          heatTime={comparison.baseline_heat_time_min}
          power={comparison.baseline_POWER_kWh}
          green={comparison.baseline_GREEN_pct}
          stage={comparison.baseline_dominant_stage}
          confidence={comparison.baseline_confidence}
        />
        <TwinColumn
          title="Optimized recipe"
          heatTime={comparison.optimized_heat_time_min}
          power={comparison.optimized_POWER_kWh}
          green={comparison.optimized_GREEN_pct}
          stage={comparison.optimized_dominant_stage}
          confidence={comparison.optimized_confidence}
          highlight
        />
      </div>
      <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">
        <p className="font-medium text-accent">
          Improvement {formatDurationMinutes(Number(comparison.heat_time_improvement_min ?? 0))}
        </p>
        <p className="mt-2 text-muted-foreground">{comparison.recommendation}</p>
        {comparison.stage_explanation ? (
          <p className="mt-2 text-muted-foreground">{comparison.stage_explanation}</p>
        ) : null}
      </div>
    </SectionCard>
  );
}

function TwinColumn({
  title,
  heatTime,
  power,
  green,
  stage,
  confidence,
  highlight,
}: {
  title: string;
  heatTime?: number;
  power?: number;
  green?: number;
  stage?: string;
  confidence?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-primary/40 bg-primary/5" : "border-border/80"}`}>
      <p className="text-label">{title}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Heat time</p>
          <p className="font-semibold">{formatDurationMinutes(Number(heatTime ?? 0))}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Power</p>
          <p className="font-semibold">{Math.round(Number(power ?? 0)).toLocaleString()} kWh</p>
        </div>
        <div>
          <p className="text-muted-foreground">GREEN</p>
          <p className="font-semibold">{Number(green ?? 0).toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Dominant stage</p>
          <p className="font-semibold capitalize">{stage ?? "—"}</p>
        </div>
      </div>
      {confidence ? <p className="mt-3 text-xs text-muted-foreground">Confidence {confidence}</p> : null}
    </div>
  );
}

export function TimelineCard({
  trace,
  totalMs,
}: {
  trace: Array<{ engine_name: string; duration_ms: number; status: string }>;
  totalMs: number;
}) {
  return (
    <SectionCard title="Execution trace" description={`Pipeline completed in ${(totalMs / 1000).toFixed(1)}s`}>
      <div className="space-y-2">
        {trace.map((step) => (
          <div key={step.engine_name} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2 text-sm">
            <span>{step.engine_name}</span>
            <div className="flex items-center gap-3 text-muted-foreground">
              <span>{step.duration_ms.toFixed(0)} ms</span>
              <span className="uppercase">{step.status}</span>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
