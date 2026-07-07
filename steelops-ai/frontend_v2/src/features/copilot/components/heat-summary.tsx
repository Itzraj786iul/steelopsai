"use client";

import { memo } from "react";
import { motion } from "framer-motion";

import { recipeFingerprint } from "@/features/preheat/utils/preheat-utils";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage, ScheduleItem } from "@/types/preheat.types";
import type { Heat } from "@/types/heat.types";
import { formatDurationMinutes } from "@/lib/date-utils";
import { StatusBadge } from "@/components/data-display/status-badge";
import { TapToTapPanel } from "@/features/copilot/components/tap-to-tap-panel";

interface HeatSummaryProps {
  heat?: Heat | null;
  scheduleItem?: ScheduleItem;
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
}

export const HeatSummary = memo(function HeatSummary({
  heat,
  scheduleItem,
  pkg,
  portfolio,
}: HeatSummaryProps) {
  const recipe = pkg.planned_recipe;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col rounded-2xl border border-border/80 bg-card shadow-elevation-sm"
    >
      <div className="border-b border-border/70 px-5 py-4">
        <p className="text-label">Planned heat</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <h2 className="text-heading-md">{heat?.heat_number ?? "Scheduled heat"}</h2>
          {scheduleItem?.status ? <StatusBadge status={scheduleItem.status} /> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Grade {pkg.grade} · Shift {scheduleItem?.shift ?? pkg.shift}
        </p>
      </div>

      <div className="flex-1 space-y-5 p-5">
        <div>
          <p className="text-label mb-2">Recipe inputs (t)</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {["HM", "DRI", "CPC", "LIME", "DOLO"].map((key) => (
              <div key={key} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">{key}</p>
                <p className="font-mono font-medium">{Number(recipe[key] ?? 0).toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>

        <InfoBlock label="Fingerprint" value={recipeFingerprint(recipe)} mono />
        <InfoBlock label="Baseline prediction" value={formatDurationMinutes(portfolio.predictedAt)} mono />
        <InfoBlock label="Operator" value={scheduleItem?.operator_name ?? "Unassigned"} />
        <InfoBlock
          label="Material summary"
          value={`HM ${Number(recipe.HM).toFixed(1)} t · DRI ${Number(recipe.DRI).toFixed(1)} t · Bucket ${Number(recipe.Bucket ?? 12)}`}
        />

        {pkg.tap_to_tap_prediction ? <TapToTapPanel prediction={pkg.tap_to_tap_prediction} /> : null}
      </div>
    </motion.aside>
  );
});

function InfoBlock({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-label">{label}</p>
      <p className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
