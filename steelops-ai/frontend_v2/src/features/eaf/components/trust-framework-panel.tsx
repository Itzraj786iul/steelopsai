"use client";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/layout/section-card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { HybridTrustResponse } from "@/lib/api/eaf";

const METRIC_HELP: Record<string, string> = {
  "Reliability Index":
    "Weighted composite (0–100) from AI confidence, physics confidence, industrial rules, historical similarity, recommendation stability, and cross-source agreement (Phase 32).",
  "AI Confidence":
    "Prediction interval width, feature density in training space, outlier score, and historical similarity to nearest plant heats.",
  "Physics Confidence":
    "Feasibility of recommended burden/flux adjustments against Phase 20 operating windows and metallurgical constraints.",
  "Industrial Confidence":
    "Industrial rule satisfaction, violation count, and alignment with plant operating practice.",
  "Historical Similarity":
    "Percent match of the planning recipe to nearest historical heats in the Phase 16 cohort.",
  "Recommendation Stability":
    "Robustness of the ranked recommendation under small perturbations of HM/DRI/flux inputs (Phase 31 V2).",
  Consensus:
    "Strong / Moderate / Weak / Conflict — agreement between physics, ML, historical, and operator preference signals.",
};

function MetricRow({
  label,
  value,
  suffix = "",
  highlight,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 py-3 last:border-0">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="text-muted-foreground/70 hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{METRIC_HELP[label] ?? label}</TooltipContent>
        </Tooltip>
      </div>
      <span className={`font-mono text-sm ${highlight ? "text-lg font-semibold text-primary" : ""}`}>
        {value}
        {suffix}
      </span>
    </div>
  );
}

function consensusVariant(consensus: string): "default" | "secondary" | "outline" | "destructive" {
  const c = consensus.toLowerCase();
  if (c.includes("strong")) return "default";
  if (c.includes("conflict")) return "destructive";
  if (c.includes("weak")) return "outline";
  return "secondary";
}

export function TrustFrameworkPanel({ trust }: { trust: HybridTrustResponse }) {
  return (
    <TooltipProvider>
      <SectionCard title="Phase 32 Trust Framework" description="Hybrid physics + AI decision support metrics">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Predicted TTT</p>
            <p className="font-mono text-3xl font-bold text-primary">{trust.predicted_ttt.toFixed(2)} min</p>
          </div>
          <Badge variant={consensusVariant(trust.consensus)}>{trust.consensus}</Badge>
          <Badge variant="outline">{trust.reliability_tier}</Badge>
        </div>
        <div className="divide-y rounded-lg border bg-muted/20 px-4">
          <MetricRow label="Reliability Index" value={trust.reliability_index.toFixed(1)} suffix=" / 100" highlight />
          <MetricRow label="AI Confidence" value={trust.ai_confidence.toFixed(0)} suffix=" / 100" />
          <MetricRow label="Physics Confidence" value={trust.physics_confidence.toFixed(0)} suffix=" / 100" />
          <MetricRow label="Industrial Confidence" value={trust.industrial_confidence.toFixed(0)} suffix=" / 100" />
          <MetricRow label="Historical Similarity" value={trust.historical_similarity_pct.toFixed(0)} suffix="%" />
          <MetricRow label="Recommendation Stability" value={trust.recommendation_stability.toFixed(0)} suffix=" / 100" />
          <MetricRow label="Consensus" value={trust.consensus} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Cross-source agreement: {trust.agreement_pct.toFixed(0)}% · Hybrid quality score: {trust.hybrid_score.toFixed(1)}
        </p>
      </SectionCard>
    </TooltipProvider>
  );
}
