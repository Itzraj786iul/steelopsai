"use client";

import { motion } from "framer-motion";

import type { EafRecipe, SimilarHeatItem } from "@/lib/api/eaf";
import { RECIPE_FIELD_LABELS } from "@/lib/eaf-labels";
import { industrialEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const BURDEN_KEYS = ["HM", "DRI", "HBI", "Bucket"] as const;
const BURDEN_COLORS = {
  HM: "bg-sky-600",
  DRI: "bg-amber-600",
  HBI: "bg-violet-600",
  Bucket: "bg-stone-500",
} as const;

interface TttComparisonBarsProps {
  historicalActual?: number | null;
  predicted?: number | null;
  optimized?: number | null;
  className?: string;
}

/** Horizontal industrial bars — instant high/low vs history. */
export function TttComparisonBars({
  historicalActual,
  predicted,
  optimized,
  className,
}: TttComparisonBarsProps) {
  const rows = [
    {
      key: "hist",
      label: "Historical actual",
      value: historicalActual ?? null,
      barClass: "bg-emerald-600",
      textClass: "text-emerald-700 dark:text-emerald-400",
    },
    {
      key: "pred",
      label: "Current predicted",
      value: predicted ?? null,
      barClass: "bg-blue-600",
      textClass: "text-blue-700 dark:text-blue-400",
    },
    {
      key: "opt",
      label: "Optimized",
      value: optimized ?? null,
      barClass: "bg-violet-600",
      textClass: "text-violet-700 dark:text-violet-400",
    },
  ] as const;

  const values = rows.map((r) => r.value).filter((v): v is number => v != null && Number.isFinite(v));
  const max = values.length ? Math.max(...values, 1) : 1;
  const predVsHist =
    historicalActual != null && predicted != null && Number.isFinite(historicalActual) && Number.isFinite(predicted)
      ? predicted - historicalActual
      : null;

  return (
    <div className={cn("rounded-lg border border-border/60 bg-background/60 p-4", className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TTT comparison</p>
          <p className="text-sm text-muted-foreground">Where this heat sits vs history and optimizer</p>
        </div>
        {predVsHist != null ? (
          <p
            className={cn(
              "font-mono text-sm font-semibold",
              predVsHist > 0.15
                ? "text-amber-700 dark:text-amber-400"
                : predVsHist < -0.15
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground"
            )}
          >
            Predicted {predVsHist >= 0 ? "+" : ""}
            {predVsHist.toFixed(2)} min vs historical
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const pct = row.value != null && Number.isFinite(row.value) ? Math.max(4, (row.value / max) * 100) : 0;
          return (
            <div key={row.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className={cn("font-mono font-semibold", row.textClass)}>
                  {row.value != null && Number.isFinite(row.value) ? `${row.value.toFixed(2)} min` : "—"}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted/70">
                <motion.div
                  className={cn("h-full rounded-full", row.barClass, row.value == null && "opacity-30")}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ ...industrialEase, delay: 0.08 + index * 0.08, duration: 0.45 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type BurdenKey = (typeof BURDEN_KEYS)[number];

function burdenTotals(parts: Partial<Record<BurdenKey, number | null | undefined>>) {
  const values = BURDEN_KEYS.map((k) => {
    const n = parts[k];
    return typeof n === "number" && Number.isFinite(n) ? Math.max(0, n) : 0;
  });
  const total = values.reduce((a, b) => a + b, 0);
  return { values, total };
}

function StackedBurdenBar({
  label,
  parts,
  delay = 0,
}: {
  label: string;
  parts: Partial<Record<BurdenKey, number | null | undefined>>;
  delay?: number;
}) {
  const { values, total } = burdenTotals(parts);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">{total > 0 ? `${total.toFixed(1)} t` : "—"}</span>
      </div>
      <div className="flex h-4 overflow-hidden rounded-md bg-muted/70">
        {total > 0
          ? BURDEN_KEYS.map((key, i) => {
              const v = values[i];
              if (v <= 0) return null;
              const pct = (v / total) * 100;
              return (
                <motion.div
                  key={key}
                  className={cn("h-full", BURDEN_COLORS[key])}
                  title={`${RECIPE_FIELD_LABELS[key]}: ${v.toFixed(1)} t`}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ ...industrialEase, delay: delay + i * 0.05, duration: 0.4 }}
                />
              );
            })
          : null}
      </div>
    </div>
  );
}

interface BurdenMixCompareProps {
  currentRecipe?: EafRecipe | null;
  similarHeat?: SimilarHeatItem | null;
  className?: string;
}

/** Stacked burden mix — current vs most similar historical heat. */
export function BurdenMixCompare({ currentRecipe, similarHeat, className }: BurdenMixCompareProps) {
  if (!currentRecipe && !similarHeat) return null;

  const histParts: Partial<Record<BurdenKey, number | null | undefined>> = {
    HM: similarHeat?.HM,
    DRI: similarHeat?.DRI,
    HBI: similarHeat?.HBI,
    Bucket: similarHeat?.Bucket,
  };
  const currentParts: Partial<Record<BurdenKey, number | null | undefined>> = {
    HM: currentRecipe?.HM,
    DRI: currentRecipe?.DRI,
    HBI: currentRecipe?.HBI,
    Bucket: currentRecipe?.Bucket,
  };

  const hasHist = burdenTotals(histParts).total > 0;

  return (
    <div className={cn("rounded-lg border border-border/60 bg-background/60 p-4", className)}>
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Burden mix</p>
        <p className="text-sm text-muted-foreground">
          Metallic charge share — current heat vs similar historical
          {similarHeat?.heat_id ? ` (#${similarHeat.heat_id})` : ""}
        </p>
      </div>

      <div className="space-y-3">
        <StackedBurdenBar label="Current input" parts={currentParts} delay={0.05} />
        <StackedBurdenBar
          label={hasHist ? "Historical similar" : "Historical similar (recipe unavailable — re-predict)"}
          parts={histParts}
          delay={0.2}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {BURDEN_KEYS.map((key) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2.5 w-2.5 rounded-sm", BURDEN_COLORS[key])} />
            {RECIPE_FIELD_LABELS[key] ?? key}
          </span>
        ))}
      </div>
    </div>
  );
}
