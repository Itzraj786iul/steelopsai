"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

interface VizPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Screen reader summary */
  summary?: string;
  actions?: React.ReactNode;
}

export const VizPanel = memo(function VizPanel({
  title,
  description,
  children,
  className,
  summary,
  actions,
}: VizPanelProps) {
  return (
    <section
      className={cn("glass-panel rounded-2xl p-5", className)}
      aria-label={title}
      role="img"
      aria-describedby={summary ? `${title}-summary` : undefined}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-label">{title}</h3>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions}
      </div>
      {summary ? (
        <p id={`${title}-summary`} className="sr-only">
          {summary}
        </p>
      ) : null}
      {children}
    </section>
  );
});

interface IndustrialLegendProps {
  items: Array<{ label: string; color: string }>;
  className?: string;
}

export const IndustrialLegend = memo(function IndustrialLegend({ items, className }: IndustrialLegendProps) {
  return (
    <ul className={cn("flex flex-wrap gap-4 text-xs text-muted-foreground", className)} role="list">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
});
