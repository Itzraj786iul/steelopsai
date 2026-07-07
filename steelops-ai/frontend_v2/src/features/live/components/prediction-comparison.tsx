"use client";

import { memo } from "react";

import { buildComparisonRows } from "@/features/live/utils/live-utils";
import type { LiveHeatDetail } from "@/types/live.types";

export const PredictionComparison = memo(function PredictionComparison({
  detail,
  predictedAtMin,
}: {
  detail: LiveHeatDetail;
  predictedAtMin: number;
}) {
  const rows = buildComparisonRows(detail, predictedAtMin);

  return (
    <section className="rounded-xl border border-border/80 bg-card/50 p-4">
      <p className="text-label mb-3">Predicted vs actual</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b text-left text-muted-foreground">
            <tr>
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">Predicted</th>
              <th className="py-2 pr-4">Actual</th>
              <th className="py-2">Deviation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metric} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-4 font-medium">{row.metric}</td>
                <td className="py-2 pr-4 font-mono">{row.predicted.toFixed(2)} {row.unit}</td>
                <td className="py-2 pr-4 font-mono">{row.actual.toFixed(2)} {row.unit}</td>
                <td className={`py-2 font-mono ${Math.abs(row.deviationPct) > 5 ? "text-warning" : "text-success"}`}>
                  {row.deviationPct > 0 ? "+" : ""}
                  {row.deviationPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
});
