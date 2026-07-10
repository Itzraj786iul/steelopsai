"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import type { OptimizationRow } from "@/lib/api/eaf";
import { formatVariableLabel } from "@/lib/eaf-labels";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";

interface OptimizerChangeCardsProps {
  rows: OptimizationRow[];
  physicsCompliant?: boolean;
  title?: string;
}

const TONNE_VARS = new Set(["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO"]);
const KWH_VARS = new Set(["POWER"]);

function variableUnit(variable: string): string {
  if (TONNE_VARS.has(variable)) return "t";
  if (KWH_VARS.has(variable)) return "kWh";
  return "";
}

function formatValue(value: number, unit: string): string {
  const formatted = value.toFixed(1);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function OptimizerChangeCards({
  rows,
  physicsCompliant,
  title = "Recommended Burden Changes",
}: OptimizerChangeCardsProps) {
  if (!rows?.length) {
    return (
      <SectionCard title={title}>
        <p className="text-sm text-muted-foreground">No recipe adjustments recommended.</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={title} description="Industrial change summary with engineering rationale">
      <div className="space-y-4">
        {rows.map((row) => {
          const unit = variableUnit(row.variable);
          const delta = row.difference;
          const direction = delta > 0.01 ? "up" : delta < -0.01 ? "down" : "flat";
          const statusClass =
            direction === "up"
              ? INDUSTRIAL_STATUS.prediction.className
              : direction === "down"
                ? INDUSTRIAL_STATUS.validated.className
                : INDUSTRIAL_STATUS.historical.className;

          return (
            <div key={row.variable} className={cn("rounded-lg border p-4", statusClass)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{row.display_name ?? formatVariableLabel(row.variable)}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm">
                    <span>{formatValue(row.current, unit)}</span>
                    <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="font-bold">{formatValue(row.optimized, unit)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {direction === "up" ? (
                    <Badge className={INDUSTRIAL_STATUS.prediction.className}>
                      <ArrowUp className="mr-1 h-3 w-3" aria-hidden />
                      +{Math.abs(delta).toFixed(1)} {unit}
                    </Badge>
                  ) : direction === "down" ? (
                    <Badge className={INDUSTRIAL_STATUS.validated.className}>
                      <ArrowDown className="mr-1 h-3 w-3" aria-hidden />
                      −{Math.abs(delta).toFixed(1)} {unit}
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Minus className="mr-1 h-3 w-3" aria-hidden />
                      No change
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-3 border-t border-border/40 pt-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Reason</p>
                <p className="mt-1 text-sm">{row.reason}</p>
              </div>
            </div>
          );
        })}
      </div>
      {physicsCompliant != null ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Physics compliant:{" "}
          <strong className={physicsCompliant ? "text-emerald-600" : "text-red-600"}>
            {physicsCompliant ? "YES" : "NO"}
          </strong>
        </p>
      ) : null}
    </SectionCard>
  );
}
