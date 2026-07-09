"use client";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import type { OptimizeV2Recommendation } from "@/lib/api/eaf";

interface AltRow {
  rank: number;
  predicted_ttt: number;
  improvement_min: number;
  reliability?: number;
  confidence?: string;
  physics_score?: number;
  historical_similarity_pct?: number;
  industrial_score?: number;
  rules_violated?: number;
  physics_feasible?: boolean;
}

export function RecommendationAlternativesPanel({
  alternatives,
  title = "Top 5 feasible recommendations",
}: {
  alternatives: AltRow[] | OptimizeV2Recommendation[];
  title?: string;
}) {
  if (!alternatives?.length) return null;

  return (
    <SectionCard title={title} description="Compare side-by-side before applying a recipe change">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-2">Rank</th>
              <th className="pr-2">Predicted TTT</th>
              <th className="pr-2">Saving</th>
              <th className="pr-2">Reliability</th>
              <th className="pr-2">Physics</th>
              <th className="pr-2">Similarity</th>
              <th className="pr-2">Industrial</th>
              <th className="pr-2">Violations</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.map((alt) => {
              const reliability =
                "reliability" in alt && alt.reliability != null
                  ? alt.reliability
                  : undefined;
              const physics =
                "physics_score" in alt
                  ? alt.physics_score
                  : "physics_feasible" in alt
                    ? alt.physics_feasible
                      ? 100
                      : 0
                    : undefined;
              const industrial = "industrial_score" in alt ? alt.industrial_score : undefined;
              const violations = "rules_violated" in alt ? alt.rules_violated : undefined;
              const confidence = "confidence" in alt ? alt.confidence : "—";
              const similarity =
                "historical_similarity_pct" in alt ? alt.historical_similarity_pct : undefined;

              return (
                <tr key={alt.rank} className="border-b border-border/50 align-top">
                  <td className="py-2 pr-2 font-medium">{alt.rank}</td>
                  <td className="pr-2 font-mono">{alt.predicted_ttt.toFixed(2)} min</td>
                  <td className="pr-2 font-mono text-green-600">{alt.improvement_min.toFixed(2)} min</td>
                  <td className="pr-2 font-mono">{reliability != null ? reliability.toFixed(1) : "—"}</td>
                  <td className="pr-2 font-mono">{physics != null ? (typeof physics === "number" ? physics.toFixed(0) : physics) : "—"}</td>
                  <td className="pr-2">{similarity != null ? `${similarity.toFixed(0)}%` : "—"}</td>
                  <td className="pr-2 font-mono">{industrial != null ? industrial.toFixed(0) : "—"}</td>
                  <td className="pr-2">
                    {violations != null ? (
                      <Badge variant={violations > 0 ? "destructive" : "outline"}>{violations}</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{confidence}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
