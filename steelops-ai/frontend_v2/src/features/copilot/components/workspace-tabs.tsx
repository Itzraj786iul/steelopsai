"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { SectionCard } from "@/components/layout/section-card";
import type { FlowStep, ReasoningNode, SimilarHeatNode } from "@/components/industrial/types";
import {
  HeatFingerprint,
  OperatorActionTimeline,
  ReasoningFlow,
  RecommendationFlow,
  RiskMatrix,
} from "@/components/industrial";
import { VizPanel } from "@/components/industrial/primitives";
import { DecisionTrace } from "@/features/copilot/components/decision-trace";
import { LearningInsights } from "@/features/copilot/components/learning-insights";
import { ValidationPanel } from "@/features/copilot/components/validation-panel";
import { EvidenceTimeline, ReasoningTree } from "@/features/copilot/components/reasoning-tree";
import { SimulationSlider } from "@/features/copilot/components/simulation-slider";
import { exportPackageJson, resolvePortfolioSlot } from "@/features/copilot/utils/copilot-utils";
import { formatPortfolioLabel } from "@/features/preheat/utils/preheat-utils";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";
import type { PortfolioSlot } from "@/stores/copilot-store";
import { ActionButton } from "@/components/data-display/action-button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

const TwinCharts = dynamic(
  () => import("@/features/copilot/components/twin-charts").then((m) => m.TwinCharts),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-muted/40" /> }
);

const TABS = [
  { id: "recipe", label: "Recipe & impact" },
  { id: "analysis", label: "AI analysis" },
  { id: "reasoning", label: "Reasoning" },
  { id: "validation", label: "Validation" },
  { id: "learning", label: "Learning" },
  { id: "simulation", label: "Simulation" },
  { id: "trace", label: "Trace" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface WorkspaceTabsProps {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
  simulationProgress: number;
  onSimulationChange: (value: number) => void;
  recommendationPipeline: FlowStep[];
  reasoningNodes: ReasoningNode[];
  similarHeats: SimilarHeatNode[];
  riskItems: Array<{ label: string; likelihood: number; impact: number }>;
  alternatives: PreheatDecisionPackage["alternative_recipes"];
  selectedPortfolio: PortfolioSlot;
  onPortfolioChange: (slot: PortfolioSlot) => void;
  recipePanel: React.ReactNode;
}

export function WorkspaceTabs({
  pkg,
  portfolio,
  simulationProgress,
  onSimulationChange,
  recommendationPipeline,
  reasoningNodes,
  similarHeats,
  riskItems,
  alternatives,
  selectedPortfolio,
  onPortfolioChange,
  recipePanel,
}: WorkspaceTabsProps) {
  const [tab, setTab] = useState<TabId>("recipe");

  return (
    <SectionCard
      title="Decision details"
      description="Recipe changes, AI analysis, validation, and export"
      animate={false}
      contentClassName="pt-2"
    >
      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border/60 pb-4 scrollbar-thin">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "recipe" ? <div className="space-y-4">{recipePanel}</div> : null}

      {tab === "analysis" ? (
        <div className="space-y-6">
          <VizPanel title="Recommendation pipeline">
            <RecommendationFlow steps={recommendationPipeline} />
          </VizPanel>
          <VizPanel title="Operator intervention path">
            <OperatorActionTimeline actions={pkg.operator_actions} />
          </VizPanel>
          <VizPanel title="Alternative portfolios">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {alternatives.slice(0, 4).map((alt) => (
                <button
                  key={String(alt.candidate_id ?? alt.portfolio_slot)}
                  type="button"
                  onClick={() => onPortfolioChange(resolvePortfolioSlot(String(alt.portfolio_slot ?? "recommended")))}
                  className={cn(
                    "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                    selectedPortfolio === resolvePortfolioSlot(String(alt.portfolio_slot ?? "recommended"))
                      ? "border-primary bg-primary/10"
                      : "border-border/70 hover:border-primary/40"
                  )}
                >
                  <p className="font-medium">{formatPortfolioLabel(alt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    AT {Number(alt.predicted_heat_time_min ?? 0).toFixed(1)} min · {alt.confidence ?? "MEDIUM"}
                  </p>
                </button>
              ))}
            </div>
          </VizPanel>
          <div className="grid gap-4 lg:grid-cols-2">
            <VizPanel title="Reasoning chain">
              <ReasoningFlow nodes={reasoningNodes} />
            </VizPanel>
            <VizPanel title="Historical similarity">
              <HeatFingerprint currentLabel="Current" similar={similarHeats} />
            </VizPanel>
          </div>
          <VizPanel title="Execution feasibility">
            <p className="text-sm">{pkg.digital_twin_comparison.recommendation ?? "Feasible within shift constraints."}</p>
            <p className="mt-2 text-sm text-muted-foreground">Risk review: {pkg.approval_requirements}</p>
            {riskItems.length > 0 ? <RiskMatrix items={riskItems} className="mt-4" /> : null}
          </VizPanel>
        </div>
      ) : null}

      {tab === "reasoning" ? (
        <div className="space-y-4">
          <ReasoningTree rootCause={pkg.root_cause} reasoning={pkg.engineering_reasoning} trace={pkg.engine_trace} />
          <EvidenceTimeline references={pkg.learning_references} />
        </div>
      ) : null}

      {tab === "validation" ? <ValidationPanel pkg={pkg} /> : null}
      {tab === "learning" ? <LearningInsights pkg={pkg} /> : null}
      {tab === "trace" ? <DecisionTrace trace={pkg.engine_trace} /> : null}

      {tab === "simulation" ? (
        <div className="space-y-4">
          <SimulationSlider value={simulationProgress} onChange={onSimulationChange} />
          <TwinCharts pkg={pkg} portfolio={portfolio} simulationProgress={simulationProgress} />
        </div>
      ) : null}

      <div className="mt-8 flex justify-end border-t border-border/60 pt-4">
        <ActionButton variant="outline" size="sm" onClick={() => exportPackageJson(pkg)}>
          <Download className="h-4 w-4" />
          Export decision JSON
        </ActionButton>
      </div>
    </SectionCard>
  );
}
