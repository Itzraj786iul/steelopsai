"use client";

import { memo } from "react";
import type { MissionHeat } from "@/features/mission/utils/mission-utils";
import { formatCurrency } from "@/lib/utils";

interface PriorityQueueProps {
  missions: MissionHeat[];
}

export const PriorityQueue = memo(function PriorityQueue({ missions }: PriorityQueueProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60" role="table" aria-label="AI priority queue">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b bg-muted/40 text-left text-label">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">Heat</th>
            <th className="px-4 py-3">Priority</th>
            <th className="px-4 py-3">Value</th>
            <th className="px-4 py-3">How certain is AI?</th>
            <th className="px-4 py-3">Deadline</th>
            <th className="px-4 py-3">Impact</th>
            <th className="px-4 py-3">Risk</th>
          </tr>
        </thead>
        <tbody>
          {missions.map((m, i) => (
            <tr key={m.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
              <td className="px-4 py-3 font-mono font-semibold text-primary">{i + 1}</td>
              <td className="px-4 py-3 font-medium">{m.heatNumber}</td>
              <td className="px-4 py-3 font-mono">{m.priorityScore}</td>
              <td className="px-4 py-3">{formatCurrency(m.businessValueInr)}</td>
              <td className="px-4 py-3">{m.confidence}</td>
              <td className="px-4 py-3 text-muted-foreground">{m.deadline ? new Date(m.deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{m.operatorImpact}</td>
              <td className="px-4 py-3">
                <span className={m.risk === "HIGH" ? "text-critical" : m.risk === "MEDIUM" ? "text-warning" : "text-accent"}>
                  {m.risk}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
