"use client";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/layout/section-card";
import type { SimilarHeatItem } from "@/lib/api/eaf";

interface SimilarHeatsPanelProps {
  heats: SimilarHeatItem[];
  title?: string;
}

export function SimilarHeatsPanel({ heats, title = "Similar Historical Heats" }: SimilarHeatsPanelProps) {
  if (!heats.length) return null;

  return (
    <SectionCard title={title} description="Top matching heats from plant history — improves operator trust">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">Heat ID</th>
              <th>Shift</th>
              <th>Charge (t)</th>
              <th>Actual TTT</th>
              <th>Δ vs prediction</th>
              <th>Similarity</th>
            </tr>
          </thead>
          <tbody>
            {heats.map((h) => (
              <tr key={h.heat_id} className="border-b border-border/50">
                <td className="py-2 font-mono">{h.heat_id}</td>
                <td>{h.shift}</td>
                <td className="font-mono">{h.charge_t.toFixed(1)}</td>
                <td className="font-mono">{h.actual_ttt?.toFixed(1) ?? "—"} min</td>
                <td className="font-mono">
                  {h.ttt_difference != null ? `${h.ttt_difference >= 0 ? "+" : ""}${h.ttt_difference.toFixed(1)} min` : "—"}
                </td>
                <td>
                  <Badge variant={h.similarity_pct >= 70 ? "default" : "outline"}>{h.similarity_pct.toFixed(0)}%</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
