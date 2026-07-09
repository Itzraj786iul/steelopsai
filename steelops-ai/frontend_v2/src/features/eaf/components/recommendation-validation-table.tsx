"use client";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/layout/section-card";
import { formatVariableLabel } from "@/lib/eaf-labels";
import type { ValidatedRecommendationRow } from "@/lib/api/eaf";

const SEVERITY_COLOR: Record<string, string> = {
  "Very Small": "outline",
  Small: "outline",
  Moderate: "secondary",
  Large: "destructive",
  Extreme: "destructive",
};

interface RecommendationValidationTableProps {
  rows: ValidatedRecommendationRow[];
}

export function RecommendationValidationTable({ rows }: RecommendationValidationTableProps) {
  const changed = rows.filter((r) => Math.abs(r.difference) > 0.01);
  if (!changed.length) return null;

  return (
    <SectionCard title="Industrial Recommendation Validation" description="Change magnitude vs historical plant practice">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">Variable</th>
              <th>Current</th>
              <th>Recommended</th>
              <th>Δ</th>
              <th>%</th>
              <th>Historical</th>
              <th>Severity</th>
              <th>Risk</th>
              <th>Acceptability</th>
            </tr>
          </thead>
          <tbody>
            {changed.map((row) => (
              <tr key={row.variable} className="border-b border-border/50 align-top">
                <td className="py-2 font-medium">{row.display_name ?? formatVariableLabel(row.variable)}</td>
                <td className="font-mono">{row.current.toFixed(2)}</td>
                <td className="font-mono">{row.optimized.toFixed(2)}</td>
                <td className="font-mono">
                  {row.difference >= 0 ? "+" : ""}
                  {row.difference.toFixed(2)}
                </td>
                <td className="font-mono">{row.pct_change.toFixed(1)}%</td>
                <td className="text-xs text-muted-foreground">{row.historical_status ?? "—"}</td>
                <td>
                  <Badge variant={(SEVERITY_COLOR[row.severity ?? ""] ?? "outline") as "outline"}>{row.severity}</Badge>
                </td>
                <td>{row.risk_level}</td>
                <td className="max-w-[140px] text-xs">{row.industrial_acceptability}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
