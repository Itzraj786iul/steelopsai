"use client";

import { useMemo } from "react";
import { Download, Printer } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { SectionCard } from "@/components/layout/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimelineCard } from "@/features/preheat/components/digital-twin-summary";
import { EngineeringReasoning } from "@/features/preheat/components/reasoning-card";
import { RecommendationTable } from "@/features/preheat/components/recipe-card";
import { PredictionCard, SavingCard } from "@/features/preheat/components/prediction-card";
import { DigitalTwinSummary } from "@/features/preheat/components/digital-twin-summary";
import { HistoricalEvidence } from "@/features/preheat/components/reasoning-card";
import { PortfolioGrid } from "@/features/preheat/components/recipe-card";
import { sortPortfolio } from "@/features/preheat/utils/preheat-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

export function DecisionPackageViewer({ packageData }: { packageData: PreheatDecisionPackage }) {
  const portfolio = useMemo(() => sortPortfolio(packageData.alternative_recipes), [packageData.alternative_recipes]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${packageData.package_id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-heading-lg">{packageData.package_id}</h2>
          <p className="text-sm text-muted-foreground">Generated {new Date(packageData.generated_at).toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <ActionButton variant="outline" onClick={exportJson}>
            <Download className="h-4 w-4" />
            Export
          </ActionButton>
          <ActionButton variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </ActionButton>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="json">JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <div className="space-y-6">
            <PredictionCard
              predictedAt={packageData.predicted_heat_time_min}
              targetAt={packageData.target_heat_time_min}
              minutesToSave={packageData.minutes_to_save}
              confidenceTier={packageData.confidence_tier}
              confidenceScore={packageData.confidence_score}
              greenPct={packageData.expected_GREEN_probability_pct}
            />
            <SavingCard minutes={packageData.minutes_to_save} valueInr={packageData.business_value_inr} />
            <RecommendationTable current={packageData.planned_recipe} recommended={packageData.recommended_optimized_recipe} />
            <EngineeringReasoning reasoning={packageData.engineering_reasoning} rootCause={packageData.root_cause} />
            <HistoricalEvidence references={packageData.learning_references} />
            <DigitalTwinSummary comparison={packageData.digital_twin_comparison} />
            <SectionCard title="Portfolio alternatives">
              <PortfolioGrid recipes={portfolio} />
            </SectionCard>
          </div>
        </TabsContent>
        <TabsContent value="trace">
          <TimelineCard trace={packageData.engine_trace} totalMs={packageData.total_execution_time_ms} />
        </TabsContent>
        <TabsContent value="json">
          <SectionCard title="Raw decision package">
            <pre className="scrollbar-thin max-h-[640px] overflow-auto rounded-lg bg-muted/30 p-4 text-xs leading-relaxed">
              {JSON.stringify(packageData, null, 2)}
            </pre>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
