"use client";

import { MetricCard } from "@/components/data-display/metric-card";
import { cn } from "@/lib/utils";

export interface KpiItem {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  highlight?: boolean;
}

interface KpiStripProps {
  items: KpiItem[];
  className?: string;
  /** Grid columns at lg breakpoint. Defaults to auto from count (max 4). */
  columns?: 2 | 3 | 4 | 6;
}

/**
 * Unified KPI strip — prefer this over SectionCard-as-metric or EafKpiCard.
 */
export function KpiStrip({ items, className, columns }: KpiStripProps) {
  if (!items.length) return null;

  const cols = columns ?? (items.length <= 2 ? 2 : items.length <= 3 ? 3 : 4);
  const colClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 3
        ? "sm:grid-cols-2 lg:grid-cols-3"
        : cols === 6
          ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
          : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={cn("grid gap-3", colClass, className)}>
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          delta={item.delta}
          trend={item.trend}
          highlight={item.highlight}
        />
      ))}
    </div>
  );
}

/** Humanize snake_case / camelCase API keys for KPI labels. */
export function humanizeKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
