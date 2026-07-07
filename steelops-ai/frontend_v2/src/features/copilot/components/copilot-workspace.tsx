"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Target } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ErrorState } from "@/components/feedback/error-state";
import { EmptyState } from "@/components/feedback/empty-state";
import { CopilotWorkspaceSkeleton } from "@/features/copilot/components/copilot-workspace-skeleton";
import { AIRecommendationCard } from "@/features/copilot/components/ai-recommendation-card";
import { ApprovalFooter } from "@/features/copilot/components/approval-footer";
import { CopilotChat } from "@/features/copilot/components/copilot-chat";
import { CopilotMissionHeader } from "@/features/copilot/components/copilot-mission-header";
import { DigitalTwinPlayer } from "@/features/copilot/components/digital-twin-player";
import { HeatSummary } from "@/features/copilot/components/heat-summary";
import { LoadHeatDialog } from "@/features/copilot/components/load-heat-dialog";
import { RecipeDelta, BusinessImpact } from "@/features/copilot/components/recipe-delta";
import { WorkspaceTimeline } from "@/features/copilot/components/decision-trace";
import { WorkspaceTabs } from "@/features/copilot/components/workspace-tabs";
import { useCopilotWorkspace } from "@/features/copilot/hooks/use-copilot-workspace";
import {
  buildRecommendationPipeline,
  buildReasoningNodes,
  buildSimilarHeats,
} from "@/features/copilot/utils/copilot-viz-helpers";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import { agentsApi } from "@/lib/api/agents";
import { queryKeys } from "@/lib/query-keys";
import { useCopilotStore } from "@/stores/copilot-store";
import type { PreheatDecisionPackage, ScheduleItem } from "@/types/preheat.types";
import type { Heat } from "@/types/heat.types";
import { getApiErrorMessage } from "@/services/api-client";

function CopilotWorkspaceLoaded({
  pkg,
  portfolio,
  heat,
  scheduleItem,
  heatId,
  approvalId,
  onRefresh,
  onLoadHeat,
  heatRows,
  loadDialogOpen,
  setLoadDialogOpen,
}: {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
  heat?: Heat;
  scheduleItem?: ScheduleItem;
  heatId: string | null;
  approvalId?: string;
  onRefresh: () => void;
  onLoadHeat: (id: string) => void;
  heatRows: ReturnType<typeof useCopilotWorkspace>["heatRows"];
  loadDialogOpen: boolean;
  setLoadDialogOpen: (open: boolean) => void;
}) {
  const selectedPortfolio = useCopilotStore((s) => s.selectedPortfolio);
  const setSelectedPortfolio = useCopilotStore((s) => s.setSelectedPortfolio);
  const simulationProgress = useCopilotStore((s) => s.simulationProgress);
  const setSimulationProgress = useCopilotStore((s) => s.setSimulationProgress);

  const alternatives = pkg.alternative_recipes.slice(0, 4);
  const recommendationPipeline = useMemo(() => buildRecommendationPipeline(pkg, portfolio), [pkg, portfolio]);
  const reasoningNodes = useMemo(() => buildReasoningNodes(pkg, portfolio), [pkg, portfolio]);
  const similarHeats = useMemo(
    () => buildSimilarHeats(heat?.heat_number ?? "Current", pkg.learning_references),
    [heat?.heat_number, pkg.learning_references]
  );
  const riskItems = useMemo(
    () =>
      [...portfolio.warnings, ...pkg.validation_errors].slice(0, 6).map((w, i) => ({
        label: w.slice(0, 24),
        likelihood: 2 + (i % 2),
        impact: pkg.copilot_ready ? 2 : 3,
      })),
    [portfolio.warnings, pkg.validation_errors, pkg.copilot_ready]
  );

  const chatContext = useMemo(() => ({ pkg, portfolio, heat }), [pkg, portfolio, heat]);

  const recipePanel = (
    <>
      <BusinessImpact portfolio={portfolio} />
      <RecipeDelta pkg={pkg} portfolio={portfolio} />
    </>
  );

  return (
    <PageContainer size="full" className="space-y-6 pb-32">
      <CopilotMissionHeader
        heat={heat}
        pkg={pkg}
        portfolio={portfolio}
        onRefresh={onRefresh}
        onLoadAnother={() => setLoadDialogOpen(true)}
      />

      <WorkspaceTimeline pkg={pkg} />

      {(portfolio.warnings.length > 0 || pkg.validation_errors.length > 0) && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Review before approving</p>
            <p className="mt-1 text-muted-foreground">
              {[...portfolio.warnings, ...pkg.validation_errors].join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-3 xl:sticky xl:top-24 xl:self-start">
          <HeatSummary
            heat={heat}
            scheduleItem={scheduleItem}
            pkg={pkg}
            portfolio={portfolio}
          />
        </aside>

        <main className="space-y-6 xl:col-span-5">
          <AIRecommendationCard pkg={pkg} portfolio={portfolio} />
        </main>

        <aside className="xl:col-span-4 xl:sticky xl:top-24 xl:self-start">
          <DigitalTwinPlayer
            pkg={pkg}
            portfolio={portfolio}
            simulationProgress={simulationProgress}
            selectedPortfolio={selectedPortfolio}
            onPortfolioChange={setSelectedPortfolio}
            onSimulationChange={setSimulationProgress}
          />
        </aside>
      </div>

      <WorkspaceTabs
        pkg={pkg}
        portfolio={portfolio}
        simulationProgress={simulationProgress}
        onSimulationChange={setSimulationProgress}
        recommendationPipeline={recommendationPipeline}
        reasoningNodes={reasoningNodes}
        similarHeats={similarHeats}
        riskItems={riskItems}
        alternatives={alternatives}
        selectedPortfolio={selectedPortfolio}
        onPortfolioChange={setSelectedPortfolio}
        recipePanel={recipePanel}
      />

      <ApprovalFooter pkg={pkg} approvalId={approvalId} heatId={heatId} />
      <CopilotChat context={chatContext} />

      <LoadHeatDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        rows={heatRows}
        onSelect={onLoadHeat}
      />
    </PageContainer>
  );
}

export function CopilotWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialHeatId = searchParams.get("heatId");
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const setChatOpen = useCopilotStore((s) => s.setChatOpen);
  const workspace = useCopilotWorkspace(initialHeatId);
  const { loadHeat } = workspace;

  const handleLoadHeat = useCallback(
    (heatId: string) => {
      loadHeat(heatId);
      router.push(`/copilot?heatId=${heatId}`);
    },
    [loadHeat, router]
  );

  const approvalsQuery = useQuery({
    queryKey: queryKeys.approvals.list("PENDING"),
    queryFn: async () => (await agentsApi.approvals("PENDING")).data,
  });

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "r" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        workspace.refresh();
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setChatOpen(true);
      }
    },
    [workspace, setChatOpen]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (workspace.isLoading && !workspace.pkg) {
    const phase = workspace.heat ? "analyzing" : "loading";
    return (
      <CopilotWorkspaceSkeleton
        heatNumber={workspace.heat?.heat_number}
        phase={phase}
      />
    );
  }

  if (workspace.isError && !workspace.pkg) {
    return (
      <PageContainer size="full">
        <ErrorState variant="prediction" message={getApiErrorMessage(workspace.error)} onRetry={workspace.refresh} />
      </PageContainer>
    );
  }

  if (!workspace.pkg || !workspace.portfolio) {
    const noHeats = workspace.heatRows.length === 0;
    return (
      <PageContainer size="default">
        <EmptyState
          icon={Target}
          title={noHeats ? "No heats on today's schedule" : "Select a heat to begin"}
          description={
            noHeats
              ? "Check Today's Mission for the shift schedule, or confirm the backend is running."
              : "Choose a planned heat to run SIFM pre-heat intelligence and review the AI recommendation."
          }
          actionLabel={noHeats ? undefined : "Select heat"}
          onAction={noHeats ? undefined : () => setLoadDialogOpen(true)}
          secondaryLabel="Open Today's Mission"
          onSecondary={() => window.location.assign("/dashboard")}
        />
        <LoadHeatDialog
          open={loadDialogOpen}
          onOpenChange={setLoadDialogOpen}
          rows={workspace.heatRows}
          onSelect={handleLoadHeat}
        />
      </PageContainer>
    );
  }

  return (
    <CopilotWorkspaceLoaded
      pkg={workspace.pkg}
      portfolio={workspace.portfolio}
      heat={workspace.heat}
      scheduleItem={workspace.scheduleItem}
      heatId={workspace.heatId}
      approvalId={approvalsQuery.data?.[0]?.id}
      onRefresh={workspace.refresh}
      onLoadHeat={handleLoadHeat}
      heatRows={workspace.heatRows}
      loadDialogOpen={loadDialogOpen}
      setLoadDialogOpen={setLoadDialogOpen}
    />
  );
}

export function CopilotWorkspacePage() {
  return (
    <Suspense fallback={<CopilotWorkspaceSkeleton />}>
      <CopilotWorkspace />
    </Suspense>
  );
}
