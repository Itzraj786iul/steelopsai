"use client";

import Link from "next/link";
import { FlaskConical, LineChart } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrentHeatBanner } from "@/features/eaf/components/current-heat-banner";
import { EafKpiCard } from "@/features/eaf/components/eaf-kpi-card";
import { EafQuickActions } from "@/features/eaf/components/eaf-quick-actions";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { useEafDashboard } from "@/features/eaf/hooks/use-eaf";
import {
  APP_VERSION,
  DATASET_VERSION,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";
import { currentCharge, formatHeatAge } from "@/stores/current-heat-store";

export function EafDashboardView() {
  const { loading, error, model, prediction, optimization, hybrid, active } = useEafDashboard();
  const predExplain = prediction?.explainability;
  const optExplain = optimization?.explainability;
  const charge = active ? currentCharge(active.recipe) : null;

  return (
    <PageContainer
      title="Dashboard"
      description="Executive overview — current heat session and production model status"
    >
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <CurrentHeatBanner />

      {active?.prediction ? (
        <SectionCard title="Current Heat" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Heat Number</p>
              <p className="text-lg font-semibold">{active.heatNumber || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Shift</p>
              <p className="text-lg font-semibold">{active.shift}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Prediction</p>
              <p className="font-mono text-lg font-bold text-primary">{active.prediction.predicted_ttt.toFixed(2)} min</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Confidence</p>
              <p className="text-lg font-semibold">{active.confidence ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Charge / Updated</p>
              <p className="font-mono text-lg">{charge?.toFixed(1)} t</p>
              <p className="text-xs text-muted-foreground">{formatHeatAge(active.lastUpdated)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" asChild>
              <Link href="/eaf/prediction">Predict</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/eaf/optimizer">Optimize</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href="/eaf/prediction">Hybrid</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href="/eaf/reports">Report</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EafKpiCard
          title="Production Model"
          value={loading ? "…" : (model?.model_name ?? "—")}
          subtitle={`${PRODUCTION_MODEL_PHASE} — deployed`}
        />
        <EafKpiCard title="Release" value={`v${APP_VERSION}`} subtitle={`Optimizer ${OPTIMIZER_PHASE}`} />
        <EafKpiCard
          title="Hybrid Reliability"
          value={hybrid ? `${hybrid.reliability_index.toFixed(0)}` : "—"}
          subtitle={hybrid?.consensus ?? "Run Predict"}
        />
        <EafKpiCard title="Research" value={RESEARCH_VERSION} subtitle="Frozen artifacts" valueClassName="text-lg" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <EafKpiCard
          title="Current Recipe Prediction"
          value={prediction ? `${prediction.predicted_ttt.toFixed(2)} min` : "—"}
          valueClassName="text-primary"
          subtitle={
            prediction
              ? `95% CI: ${prediction.ci_lower_95.toFixed(1)} – ${prediction.ci_upper_95.toFixed(1)} min`
              : "Enter recipe on Prediction"
          }
        />
        <EafKpiCard
          title="Optimized Prediction"
          value={optimization ? `${optimization.optimized_ttt.toFixed(2)} min` : "—"}
          valueClassName="text-primary"
          subtitle={optimization?.physics_compliant ? "Physics compliant" : "Run Optimizer"}
        />
        <EafKpiCard
          title="Estimated Saving"
          value={optimization ? `${optimization.improvement_min.toFixed(2)} min` : "—"}
          valueClassName="text-green-600"
          subtitle="vs current recipe"
        />
      </div>

      {prediction ? (
        <SectionCard title="Operator Summary" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-label">Confidence</p>
              <p className="text-xl font-semibold">{prediction.operator_summary?.confidence}</p>
            </div>
            <div>
              <p className="text-label">Quality</p>
              <p className="text-xl font-semibold">{predExplain?.prediction_quality ?? "—"}</p>
            </div>
            <div>
              <p className="text-label">Risk</p>
              <p className="text-xl font-semibold">{predExplain?.industrial_risk ?? prediction.operator_summary?.risk}</p>
            </div>
            <div>
              <p className="text-label">Recommendation</p>
              <p className="text-xl font-semibold">{optExplain?.recommendation_confidence ?? "—"}</p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ContributorList contributors={prediction?.top_contributors ?? []} limit={5} />
        <SectionCard title="Research Center">
          <p className="text-sm text-muted-foreground">Phases 23–33 findings — production model frozen.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>Production frozen</Badge>
            <Badge variant="outline">{DATASET_VERSION}</Badge>
          </div>
          <ActionButton className="mt-4" variant="outline" asChild>
            <Link href="/eaf/research">
              <FlaskConical className="mr-2 h-4 w-4" />
              Open Research Center
            </Link>
          </ActionButton>
        </SectionCard>
      </div>

      <SectionCard title="Model Insights" className="mt-4">
        <ActionButton variant="outline" asChild>
          <Link href="/eaf/model">
            <LineChart className="mr-2 h-4 w-4" />
            Open Model Insights
          </Link>
        </ActionButton>
      </SectionCard>

      <EafQuickActions />
    </PageContainer>
  );
}
