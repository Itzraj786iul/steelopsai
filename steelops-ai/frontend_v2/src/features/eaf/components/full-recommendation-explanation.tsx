"use client";

import { SectionCard } from "@/components/layout/section-card";
import type { RecommendationExplanation } from "@/lib/api/eaf";

export function FullRecommendationExplanation({
  explanation,
  reliabilityIndex,
}: {
  explanation?: RecommendationExplanation | Record<string, unknown>;
  reliabilityIndex?: number;
}) {
  if (!explanation || typeof explanation !== "object") return null;
  const exp = explanation as RecommendationExplanation;
  const lines = exp.narrative_lines?.length
    ? exp.narrative_lines
    : exp.narrative
      ? exp.narrative.split(/\n/)
      : [];

  if (!lines.length) return null;

  return (
    <SectionCard title="Recommendation explanation chain">
      <div className="space-y-1 font-mono text-sm">
        {lines.map((line, i) => (
          <p key={`${i}-${line.slice(0, 20)}`} className={line.startsWith("↓") ? "text-primary" : "text-foreground"}>
            {line.replace(/^↓\n?/, "↓ ")}
          </p>
        ))}
      </div>
      {exp.historical_support?.length ? (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Historical support</p>
          <p className="text-sm">{exp.historical_support.map((h) => `Heat ${h}`).join(" · ")}</p>
        </div>
      ) : null}
      {exp.literature_support?.length ? (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase text-muted-foreground">Literature</p>
          <p className="text-sm">{exp.literature_support.join(" · ")}</p>
        </div>
      ) : null}
      {reliabilityIndex != null ? (
        <p className="mt-4 text-sm">
          Reliability: <span className="font-mono font-semibold">{reliabilityIndex.toFixed(1)} / 100</span>
        </p>
      ) : null}
    </SectionCard>
  );
}
