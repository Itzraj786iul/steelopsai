"use client";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import type { ContributorItem } from "@/lib/api/eaf";
import { formatContributorLabel } from "@/lib/eaf-labels";

interface ShapInterpretationsProps {
  contributors: ContributorItem[];
  title?: string;
}

export function ShapInterpretations({ contributors, title = "Feature Interpretation" }: ShapInterpretationsProps) {
  if (!contributors.length) return null;

  return (
    <SectionCard title={title} description="Plain-language metallurgical explanation for each driver">
      <ul className="space-y-3 text-sm">
        {contributors.slice(0, 8).map((c) => (
          <li key={c.feature} className="rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{formatContributorLabel(c.feature, c.display_name)}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {c.contribution >= 0 ? "+" : ""}
                {c.contribution.toFixed(3)} min
              </Badge>
              {c.direction ? <span className="text-xs text-muted-foreground">{c.direction}</span> : null}
            </div>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {c.interpretation ?? "Influences predicted tap-to-tap based on historical operating patterns."}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
