"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import {
  ConfidenceRing,
  PredictionBand,
  SHAPWaterfall,
} from "@/components/industrial";
import { ExpandableRecommendation } from "@/features/mission/components/expandable-recommendation";
import { buildShapDrivers, buildRecommendationPipeline } from "@/features/copilot/utils/copilot-viz-helpers";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";
import { formatCurrency } from "@/lib/utils";

interface AIRecommendationCardProps {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
}

export const AIRecommendationCard = memo(function AIRecommendationCard({ pkg, portfolio }: AIRecommendationCardProps) {
  const interval95 = portfolio.predictionInterval95;
  const shapData = buildShapDrivers(portfolio);
  const pipeline = buildRecommendationPipeline(pkg, portfolio);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 shadow-elevation-sm"
    >
      <div className="absolute right-4 top-4 opacity-10">
        <Sparkles className="h-14 w-14 text-primary" />
      </div>
      <p className="text-label">AI recommendation</p>
      <h2 className="mt-2 text-heading-lg">{portfolio.label} recommendation</h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{portfolio.reasoning}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto]">
        <PredictionBand
          predicted={portfolio.predictedAt}
          target={portfolio.targetAt}
          low={interval95?.low}
          high={interval95?.high}
          savingsMin={portfolio.minutesToSave}
        />
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/60 bg-background/40 p-4">
          <ConfidenceRing score={portfolio.confidenceScore} tier={portfolio.confidenceTier} />
          <p className="text-xs text-muted-foreground">{portfolio.predictionQuality ?? pkg.prediction_quality ?? "SIFM"}</p>
          <p className="font-mono text-[10px] text-muted-foreground">{portfolio.modelVersion ?? pkg.model_version ?? "SIFM"}</p>
        </div>
      </div>

      {shapData.length > 0 ? (
        <div className="mt-6">
          <p className="text-label mb-2">SHAP driver waterfall</p>
          <SHAPWaterfall drivers={shapData} />
        </div>
      ) : null}

      <div className="mt-6">
        <ExpandableRecommendation
          title={portfolio.label}
          confidenceTier={portfolio.confidenceTier}
          detail={{
            why: pkg.root_cause,
            whatChanges: pipeline[1]?.description ?? portfolio.reasoning,
            howMuch: pipeline[2]?.value ?? "—",
            risk: pkg.validation_errors.join(" · ") || "Low — within playbook",
            confidence: `${portfolio.confidenceTier} (${portfolio.confidenceScore}%)`,
            approver: pkg.approval_requirements,
            businessValue: formatCurrency(portfolio.businessValueInr),
            evidence: pkg.learning_references[0]?.description ?? "Similar heats in learning library",
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>
          Business impact <span className="font-medium text-foreground">{formatCurrency(portfolio.businessValueInr)}</span>
        </span>
        <span>
          GREEN <span className="font-medium text-accent">{portfolio.greenPct.toFixed(1)}%</span>
        </span>
        <span>Uncertainty ±{portfolio.uncertainty?.toFixed(1) ?? "—"} min</span>
        <span>Approval: {pkg.approval_requirements}</span>
      </div>
    </motion.section>
  );
});
