"use client";

import { cn } from "@/lib/utils";

interface OperatorWorkSurfaceProps {
  children: React.ReactNode;
  className?: string;
}

/** Dense floor layout: tighter vertical rhythm than research pages. */
export function OperatorWorkSurface({ children, className }: OperatorWorkSurfaceProps) {
  return <div className={cn("operator-flow space-y-4 sm:space-y-5", className)}>{children}</div>;
}

interface OperatorHeroMetricProps {
  eyebrow: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  accent?: "prediction" | "primary" | "success" | "warning";
  className?: string;
  side?: React.ReactNode;
}

const ACCENT = {
  prediction: "border-prediction/30 bg-prediction/5",
  primary: "border-primary/30 bg-primary/5",
  success: "border-success/30 bg-success/5",
  warning: "border-warning/35 bg-warning/5",
} as const;

const VALUE = {
  prediction: "text-prediction",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
} as const;

/** One dominant number the operator should read first. */
export function OperatorHeroMetric({
  eyebrow,
  value,
  unit,
  hint,
  accent = "prediction",
  className,
  side,
}: OperatorHeroMetricProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5",
        ACCENT[accent],
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-label">{eyebrow}</p>
        <p className={cn("mt-1 font-mono text-4xl font-bold tracking-tight sm:text-5xl", VALUE[accent])}>
          {value}
          {unit ? <span className="ml-1.5 text-xl font-semibold text-muted-foreground sm:text-2xl">{unit}</span> : null}
        </p>
        {hint ? <div className="mt-2 text-sm text-muted-foreground">{hint}</div> : null}
      </div>
      {side ? <div className="shrink-0">{side}</div> : null}
    </div>
  );
}

interface OperatorContextBarProps {
  items: { label: string; value: React.ReactNode }[];
  actions?: React.ReactNode;
  className?: string;
}

/** Compact heat context — replaces a full equal-weight card for “this heat”. */
export function OperatorContextBar({ items, actions, className }: OperatorContextBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border/70 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2">
        {items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface OperatorStickyActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/** Sticky primary action zone for predict / save. */
export function OperatorStickyActionBar({ children, className }: OperatorStickyActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-3 border-t border-border/70 bg-background/95 px-3 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-md sm:-mx-4 sm:px-4 md:-mx-8 md:px-8",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
