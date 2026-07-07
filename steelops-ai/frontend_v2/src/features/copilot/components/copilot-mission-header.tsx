"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, Target } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBadge } from "@/features/preheat/components/confidence-badge";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";
import type { Heat } from "@/types/heat.types";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";

interface CopilotMissionHeaderProps {
  heat?: Heat | null;
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
  onRefresh: () => void;
  onLoadAnother: () => void;
}

export const CopilotMissionHeader = memo(function CopilotMissionHeader({
  heat,
  pkg,
  portfolio,
  onRefresh,
  onLoadAnother,
}: CopilotMissionHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-glow-ai md:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="ghost" size="sm" asChild className="h-8 px-2 text-muted-foreground">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Today
              </Link>
            </ActionButton>
            <Badge variant="secondary" className="gap-1">
              <Target className="h-3 w-3" />
              Mission workspace
            </Badge>
            {pkg.copilot_ready ? (
              <Badge className="bg-accent/15 text-accent">Ready to approve</Badge>
            ) : (
              <Badge variant="outline">Review required</Badge>
            )}
          </div>

          <div>
            <p className="text-label">Pre-heat decision intelligence</p>
            <h1 className="text-display-sm md:text-display-md">{heat?.heat_number ?? "Planned heat"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Grade {pkg.grade} · Shift {pkg.shift} · {portfolio.label} portfolio — review AI recommendation, simulate in the digital twin, then approve.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <ActionButton variant="outline" size="sm" onClick={onLoadAnother}>
            Change heat
          </ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Predicted heat time" value={formatDurationMinutes(portfolio.predictedAt)} />
        <Metric label="Target" value={formatDurationMinutes(portfolio.targetAt)} accent />
        <Metric label="Minutes to save" value={formatDurationMinutes(portfolio.minutesToSave)} accent />
        <Metric label="Business value" value={formatCurrency(portfolio.businessValueInr)} />
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <p className="text-label">AI confidence</p>
          <div className="mt-2">
            <ConfidenceBadge tier={portfolio.confidenceTier} score={portfolio.confidenceScore} />
          </div>
        </div>
      </div>
    </motion.header>
  );
});

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="text-label">{label}</p>
      <p className={`mt-1 font-mono text-lg font-semibold ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
