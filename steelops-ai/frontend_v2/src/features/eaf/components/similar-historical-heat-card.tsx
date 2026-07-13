"use client";

import { Database } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { OpenPageLink } from "@/features/eaf/components/prediction-next-actions";
import { BurdenMixCompare, TttComparisonBars } from "@/features/eaf/components/prediction-visuals";
import type { EafRecipe, OptimizeResponse, SimilarHeatItem } from "@/lib/api/eaf";
import { RECIPE_FIELD_LABELS } from "@/lib/eaf-labels";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";

const COMPARE_KEYS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"] as const;

type CompareKey = (typeof COMPARE_KEYS)[number];

interface SimilarHistoricalHeatCardProps {
  heats: SimilarHeatItem[];
  predictedTtt?: number;
  currentRecipe?: EafRecipe | null;
  optimizer?: OptimizeResponse | null;
}

function fmtNum(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function deltaClass(delta: number | null): string {
  if (delta == null || !Number.isFinite(delta) || Math.abs(delta) < 1e-6) return "text-muted-foreground";
  return delta > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400";
}

export function SimilarHistoricalHeatCard({
  heats,
  predictedTtt,
  currentRecipe,
  optimizer,
}: SimilarHistoricalHeatCardProps) {
  if (!heats.length) return null;

  const ranked = [...heats].sort((a, b) => b.similarity_pct - a.similarity_pct);
  const best = ranked[0];
  const others = ranked.slice(1, 5);

  const histActual = best.actual_ttt ?? null;
  const currentPredicted = predictedTtt ?? best.predicted_ttt;
  const optimizedTtt = optimizer?.optimized_ttt ?? null;
  const optimizedRecipe = optimizer?.optimized_recipe ?? null;

  const predVsHist =
    histActual != null && currentPredicted != null ? currentPredicted - histActual : best.ttt_difference ?? null;
  const optVsHist = histActual != null && optimizedTtt != null ? optimizedTtt - histActual : null;
  const optVsPred =
    optimizedTtt != null && currentPredicted != null ? optimizedTtt - currentPredicted : null;

  const currentCharge = currentRecipe
    ? currentRecipe.HM + currentRecipe.DRI + currentRecipe.HBI + currentRecipe.Bucket
    : null;
  const optimizedCharge = optimizedRecipe
    ? optimizedRecipe.HM + optimizedRecipe.DRI + optimizedRecipe.HBI + optimizedRecipe.Bucket
    : null;

  return (
    <SectionCard
      title="Most Similar Historical Heat"
      description="Side-by-side burden and TTT comparison — historical reference vs current heat vs optimizer"
      actions={<OpenPageLink href="/eaf/historical" label="Historical Analysis" />}
    >
      <div className={`rounded-lg border p-4 ${INDUSTRIAL_STATUS.historical.className}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Historical Heat No." value={best.heat_id} mono />
            <Metric label="Shift" value={best.shift} />
            <Metric label="Similarity" value={`${best.similarity_pct.toFixed(0)}%`} highlight="validated" />
            <Metric label="Charge (hist)" value={`${fmtNum(best.charge_t, 1)} t`} mono />
          </div>
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" aria-hidden />
            Historical Reference
          </Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Outcome
            label="Historical Actual TTT"
            value={histActual != null ? `${fmtNum(histActual, 2)} min` : "—"}
            tone="historical"
          />
          <Outcome
            label="Current Predicted TTT"
            value={currentPredicted != null ? `${fmtNum(currentPredicted, 2)} min` : "—"}
            tone="prediction"
            hint={
              predVsHist != null
                ? `${predVsHist >= 0 ? "+" : ""}${fmtNum(predVsHist, 2)} vs historical`
                : undefined
            }
          />
          <Outcome
            label="Optimized TTT"
            value={optimizedTtt != null ? `${fmtNum(optimizedTtt, 2)} min` : "Run Optimizer"}
            tone="optimized"
            muted={optimizedTtt == null}
            hint={
              optVsHist != null
                ? `${optVsHist >= 0 ? "+" : ""}${fmtNum(optVsHist, 2)} vs historical`
                : optVsPred != null
                  ? `${optVsPred >= 0 ? "+" : ""}${fmtNum(optVsPred, 2)} vs predicted`
                  : undefined
            }
          />
          <Outcome
            label="Expected Saving"
            value={
              optimizer != null
                ? `${optimizer.improvement_min >= 0 ? "−" : "+"}${fmtNum(Math.abs(optimizer.improvement_min), 2)} min`
                : "—"
            }
            tone="optimized"
            muted={optimizer == null}
          />
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <TttComparisonBars
            historicalActual={histActual}
            predicted={currentPredicted}
            optimized={optimizedTtt}
          />
          <BurdenMixCompare
            currentRecipe={currentRecipe}
            similarHeat={best}
            optimizedRecipe={optimizedRecipe}
          />
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 font-medium">Variable</th>
              <th className="px-3 py-2.5 font-medium">Historical similar</th>
              <th className="px-3 py-2.5 font-medium">Current input</th>
              <th className="px-3 py-2.5 font-medium">Δ vs hist</th>
              <th className="px-3 py-2.5 font-medium">Optimized</th>
              <th className="px-3 py-2.5 font-medium">Δ opt vs hist</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border/50 bg-muted/10">
              <td className="px-3 py-2 font-medium">Total charge (t)</td>
              <td className="px-3 py-2 font-mono">{fmtNum(best.charge_t, 1)}</td>
              <td className="px-3 py-2 font-mono">{fmtNum(currentCharge, 1)}</td>
              <td className={cn("px-3 py-2 font-mono", deltaClass(deltaOrNull(currentCharge, best.charge_t)))}>
                {fmtDelta(currentCharge, best.charge_t)}
              </td>
              <td className="px-3 py-2 font-mono">{fmtNum(optimizedCharge, 1)}</td>
              <td className={cn("px-3 py-2 font-mono", deltaClass(deltaOrNull(optimizedCharge, best.charge_t)))}>
                {fmtDelta(optimizedCharge, best.charge_t)}
              </td>
            </tr>
            {COMPARE_KEYS.map((key) => {
              const hist = readHist(best, key);
              const current = currentRecipe?.[key] ?? null;
              const optimized = optimizedRecipe?.[key] ?? null;
              const digits = key === "POWER" || key === "OXY" || key === "CPC" ? 0 : 1;
              return (
                <tr key={key} className="border-t border-border/40">
                  <td className="px-3 py-2 text-muted-foreground">{RECIPE_FIELD_LABELS[key] ?? key}</td>
                  <td className="px-3 py-2 font-mono">{fmtNum(hist, digits)}</td>
                  <td className="px-3 py-2 font-mono">{fmtNum(current, digits)}</td>
                  <td className={cn("px-3 py-2 font-mono", deltaClass(deltaOrNull(current, hist)))}>
                    {fmtDelta(current, hist, digits)}
                  </td>
                  <td className="px-3 py-2 font-mono">{fmtNum(optimized, digits)}</td>
                  <td className={cn("px-3 py-2 font-mono", deltaClass(deltaOrNull(optimized, hist)))}>
                    {fmtDelta(optimized, hist, digits)}
                  </td>
                </tr>
              );
            })}
            <tr className="border-t border-border/50 bg-muted/10">
              <td className="px-3 py-2 font-medium">TTT (min)</td>
              <td className="px-3 py-2 font-mono">{fmtNum(histActual, 2)}</td>
              <td className="px-3 py-2 font-mono text-blue-700 dark:text-blue-400">
                {fmtNum(currentPredicted, 2)}
              </td>
              <td className={cn("px-3 py-2 font-mono", deltaClass(predVsHist))}>
                {predVsHist != null ? `${predVsHist >= 0 ? "+" : ""}${fmtNum(predVsHist, 2)}` : "—"}
              </td>
              <td className="px-3 py-2 font-mono text-violet-700 dark:text-violet-400">
                {fmtNum(optimizedTtt, 2)}
              </td>
              <td className={cn("px-3 py-2 font-mono", deltaClass(optVsHist))}>
                {optVsHist != null ? `${optVsHist >= 0 ? "+" : ""}${fmtNum(optVsHist, 2)}` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {optimizedTtt == null ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Optimized column fills after you run Optimizer on this heat (same recipe session).
        </p>
      ) : null}

      {others.length ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Next closest historical heats
          </p>
          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Heat</th>
                  <th className="px-3 py-2">Shift</th>
                  <th className="px-3 py-2">Charge</th>
                  <th className="px-3 py-2">Actual TTT</th>
                  <th className="px-3 py-2">Similarity</th>
                </tr>
              </thead>
              <tbody>
                {others.map((h) => (
                  <tr key={h.heat_id} className="border-t border-border/40">
                    <td className="px-3 py-2 font-mono">{h.heat_id}</td>
                    <td className="px-3 py-2">{h.shift}</td>
                    <td className="px-3 py-2 font-mono">{fmtNum(h.charge_t, 1)} t</td>
                    <td className="px-3 py-2 font-mono">
                      {h.actual_ttt != null ? `${fmtNum(h.actual_ttt, 2)} min` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">{fmtNum(h.similarity_pct, 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}

function readHist(heat: SimilarHeatItem, key: CompareKey): number | null {
  const value = heat[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function deltaOrNull(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a - b;
}

function fmtDelta(a: number | null | undefined, b: number | null | undefined, digits = 1): string {
  const d = deltaOrNull(a, b);
  if (d == null) return "—";
  if (Math.abs(d) < 1e-9) return "0";
  return `${d >= 0 ? "+" : ""}${d.toFixed(digits)}`;
}

function Metric({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "validated" | "prediction";
}) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-lg font-semibold",
          mono && "font-mono",
          highlight === "validated" && "text-emerald-700 dark:text-emerald-400",
          highlight === "prediction" && "text-blue-700 dark:text-blue-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Outcome({
  label,
  value,
  tone,
  hint,
  muted,
}: {
  label: string;
  value: string;
  tone: "historical" | "prediction" | "optimized";
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-background/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg font-semibold",
          muted && "text-muted-foreground",
          !muted && tone === "historical" && "text-emerald-700 dark:text-emerald-400",
          !muted && tone === "prediction" && "text-blue-700 dark:text-blue-400",
          !muted && tone === "optimized" && "text-violet-700 dark:text-violet-400"
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
