"use client";

import { ConfidenceRing } from "@/components/industrial/gauges";
import { SectionCard } from "@/components/layout/section-card";
import type { ConfidenceTier } from "@/lib/charge-validation";

interface PredictionConfidenceProps {
  tier: ConfidenceTier;
  score: number;
  charge?: number;
  bounds?: { p5: number; median: number; p95: number };
  className?: string;
}

export function PredictionConfidence({ tier, score, charge, bounds, className }: PredictionConfidenceProps) {
  return (
    <SectionCard title="Prediction Confidence" className={className}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
        <ConfidenceRing score={score} tier={tier.toUpperCase()} />
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="text-label">Level:</span>{" "}
            <strong className="text-foreground">{tier}</strong>
          </p>
          {charge !== undefined && bounds ? (
            <>
              <p>
                Total charge <span className="font-mono text-foreground">{charge.toFixed(1)} t</span> vs historical
                P5–P95 ({bounds.p5.toFixed(0)}–{bounds.p95.toFixed(0)} t, median {bounds.median.toFixed(0)} t).
              </p>
              <p className="text-xs">
                Confidence reflects distance from the historical charge distribution — not a hardcoded threshold.
              </p>
            </>
          ) : (
            <p>Based on recipe distance from historical operating distributions.</p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
