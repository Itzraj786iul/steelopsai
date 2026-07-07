"use client";

import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { VizPanel } from "@/components/industrial/primitives";
import type { OperatorLeader, ShiftMetrics } from "@/features/executive/utils/executive-metrics";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export const OperatorLeaderboard = memo(function OperatorLeaderboard({ operators }: { operators: OperatorLeader[] }) {
  const TrendIcon = { up: TrendingUp, down: TrendingDown, stable: Minus };

  return (
    <VizPanel title="Operator intelligence" description="Efficiency, adoption, and training opportunities">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b text-left text-label">
            <tr>
              <th className="py-2 pr-4">Operator</th>
              <th className="py-2 pr-4">Minutes saved</th>
              <th className="py-2 pr-4">AI adoption</th>
              <th className="py-2 pr-4">Acceptance</th>
              <th className="py-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {operators.map((op, i) => {
              const Icon = TrendIcon[op.trend];
              return (
                <tr key={op.name} className="border-b border-border/40 last:border-0">
                  <td className="py-3 pr-4 font-medium">
                    {i < 3 ? <Badge className="mr-2 bg-primary/20 text-primary">#{i + 1}</Badge> : null}
                    {op.name}
                    {op.aiAdoptionPct < 70 ? (
                      <span className="ml-2 text-xs text-warning">Training opportunity</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 font-mono text-accent">{op.minutesSaved.toFixed(1)}</td>
                  <td className="py-3 pr-4">{op.aiAdoptionPct}%</td>
                  <td className="py-3 pr-4">{op.acceptancePct}%</td>
                  <td className="py-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </VizPanel>
  );
});

export const ShiftIntelligence = memo(function ShiftIntelligence({ shifts }: { shifts: ShiftMetrics[] }) {
  return (
    <VizPanel title="Shift intelligence" description="Compare shift performance">
      <div className="grid gap-4 md:grid-cols-3">
        {shifts.map((s) => (
          <div key={s.shift} className="rounded-xl border border-border/60 bg-muted/10 p-4">
            <p className="text-label">Shift {s.shift}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Metric label="Heat time" value={formatDurationMinutes(s.heatTimeMin)} />
              <Metric label="Recommendation usage" value={`${s.recommendationUsagePct}%`} />
              <Metric label="Savings" value={formatCurrency(s.savingsInr)} accent />
              <Metric label="GREEN" value={`${s.greenPct.toFixed(1)}%`} />
              <Metric label="Confidence" value={`${s.confidencePct}%`} />
            </dl>
          </div>
        ))}
      </div>
    </VizPanel>
  );
});

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={accent ? "font-mono font-medium text-accent" : "font-mono"}>{value}</dd>
    </div>
  );
}
