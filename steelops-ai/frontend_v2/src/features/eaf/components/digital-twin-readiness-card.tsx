"use client";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import type { DigitalTwinReadiness } from "@/lib/api/eaf";

interface DigitalTwinReadinessCardProps {
  readiness?: DigitalTwinReadiness | null;
}

export function DigitalTwinReadinessCard({ readiness }: DigitalTwinReadinessCardProps) {
  if (!readiness) return null;

  return (
    <SectionCard title="Digital Twin Readiness" description="Informational maturity score — does not affect predictions">
      <div className="flex items-center gap-4">
        <p className="font-mono text-4xl font-bold text-primary">{readiness.overall_score}%</p>
        <div>
          <Badge>{readiness.readiness_tier}</Badge>
          <p className="mt-1 text-sm text-muted-foreground">Overall system readiness for digital twin V2+</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {Object.entries(readiness.layers).map(([key, layer]) => (
          <div key={key} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="capitalize">{key.replace(/_/g, " ")}</span>
              <span className="font-mono font-medium">{layer.score}%</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{layer.status}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
