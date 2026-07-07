"use client";

import { memo } from "react";
import { VizPanel } from "@/components/industrial/primitives";
import type { RoiMetrics } from "@/features/executive/utils/executive-metrics";
import { formatCurrency } from "@/lib/utils";

export const AiRoiDashboard = memo(function AiRoiDashboard({ roi }: { roi: RoiMetrics }) {
  return (
    <VizPanel title="AI ROI dashboard" description="Investment vs returns — board-ready numbers">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <RoiCard label="Platform investment" value={formatCurrency(roi.investmentInr)} />
        <RoiCard label="Savings today" value={formatCurrency(roi.savingsInr)} accent />
        <RoiCard label="Payback period" value={`${roi.paybackMonths} months`} />
        <RoiCard label="Annual ROI" value={`${roi.annualRoiPct}%`} accent />
        <RoiCard label="Projected annual value" value={formatCurrency(roi.projectedAnnualInr)} />
        <RoiCard label="CO₂ avoided (annual)" value={`${roi.co2AvoidedT.toFixed(0)}t`} />
        <RoiCard label="Energy saved (annual)" value={`${roi.energySavedMwh.toFixed(0)} MWh`} />
      </div>
      <p className="mt-6 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
        At current adoption, SteelOps AI delivers <strong>{roi.annualRoiPct}% annual ROI</strong> with payback in{" "}
        <strong>{roi.paybackMonths} months</strong> — before counting quality and safety benefits.
      </p>
    </VizPanel>
  );
});

function RoiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-4">
      <p className="text-label">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}
