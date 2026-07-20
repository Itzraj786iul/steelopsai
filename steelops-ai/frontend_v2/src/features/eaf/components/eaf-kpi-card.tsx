import { MetricCard } from "@/components/data-display/metric-card";
import { cn } from "@/lib/utils";

interface EafKpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  className?: string;
  valueClassName?: string;
}

/** Thin KPI tile. Prefer `KpiStrip` for new grids of string/number metrics. */
export function EafKpiCard({ title, value, subtitle, className, valueClassName }: EafKpiCardProps) {
  if (typeof value === "string" || typeof value === "number") {
    return (
      <div className={className}>
        <MetricCard label={title} value={value} />
        {subtitle ? <p className="mt-1 px-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border/80 bg-card p-4 shadow-elevation-sm",
        className
      )}
    >
      <p className="text-label mb-2">{title}</p>
      <div className={cn("font-mono text-3xl font-semibold tracking-tight", valueClassName)}>{value}</div>
      {subtitle ? <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
