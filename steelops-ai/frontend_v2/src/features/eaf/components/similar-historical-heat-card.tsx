"use client";

import { Database } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import type { SimilarHeatItem } from "@/lib/api/eaf";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";

interface SimilarHistoricalHeatCardProps {
  heats: SimilarHeatItem[];
  predictedTtt?: number;
}

export function SimilarHistoricalHeatCard({ heats, predictedTtt }: SimilarHistoricalHeatCardProps) {
  if (!heats.length) return null;

  const best = [...heats].sort((a, b) => b.similarity_pct - a.similarity_pct)[0];
  const diff =
    predictedTtt != null && best.actual_ttt != null
      ? predictedTtt - best.actual_ttt
      : best.ttt_difference ?? null;

  return (
    <SectionCard
      title="Most Similar Historical Heat"
      description="Nearest match from plant history — builds operator trust"
    >
      <div className={`rounded-lg border p-4 ${INDUSTRIAL_STATUS.historical.className}`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Heat No." value={best.heat_id} mono />
          <Metric label="Shift" value={best.shift} />
          <Metric
            label="Historical TTT"
            value={best.actual_ttt != null ? `${best.actual_ttt.toFixed(2)} min` : "—"}
            mono
          />
          <Metric label="Similarity" value={`${best.similarity_pct.toFixed(0)}%`} highlight="validated" />
          <Metric
            label="Difference"
            value={
              diff != null
                ? `${diff >= 0 ? "+" : ""}${diff.toFixed(2)} min`
                : "—"
            }
            mono
          />
        </div>
        <div className="mt-4">
          <Badge variant="outline" className="gap-1">
            <Database className="h-3 w-3" aria-hidden />
            Historical Reference
          </Badge>
        </div>
      </div>
    </SectionCard>
  );
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
