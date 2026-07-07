"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";

import { RecipeDelta as RecipeDeltaChart, RecipeRadar, SavingsWaterfall } from "@/components/industrial";
import { VizPanel } from "@/components/industrial/primitives";
import { buildRadarData } from "@/features/copilot/utils/copilot-viz-helpers";
import { recipeDeltas } from "@/features/copilot/utils/copilot-utils";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";

export const BusinessImpact = memo(function BusinessImpact({ portfolio }: { portfolio: PortfolioView }) {
  return (
    <VizPanel
      title="Business impact"
      summary={`Recoverable ${formatDurationMinutes(portfolio.minutesToSave)}, value ${formatCurrency(portfolio.businessValueInr)}`}
    >
      <SavingsWaterfall
        baselineMinutes={portfolio.predictedAt}
        optimizedMinutes={portfolio.targetAt}
        businessValueInr={portfolio.businessValueInr}
      />
    </VizPanel>
  );
});

export const RecipeDelta = memo(function RecipeDelta({
  pkg,
  portfolio,
}: {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
}) {
  const deltas = recipeDeltas(pkg, portfolio);
  const twin = pkg.digital_twin_comparison;
  const radarData = useMemo(
    () =>
      buildRadarData(
        pkg.planned_recipe,
        portfolio.recipe,
        portfolio.predictedAt,
        portfolio.targetAt,
        twin.baseline_GREEN_pct ?? portfolio.greenPct,
        twin.optimized_GREEN_pct ?? portfolio.greenPct
      ),
    [pkg.planned_recipe, portfolio, twin]
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <VizPanel title="Recipe radar" description="Planned vs recommended portfolio">
        <RecipeRadar data={radarData} />
      </VizPanel>
      <VizPanel title="Material deltas" description="Directional changes by variable">
        {deltas.length > 0 ? <RecipeDeltaChart deltas={deltas} /> : <p className="text-sm text-muted-foreground">No material changes for this slot.</p>}
      </VizPanel>
    </motion.div>
  );
});
