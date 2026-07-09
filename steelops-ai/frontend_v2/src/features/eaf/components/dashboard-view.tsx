"use client";

import Link from "next/link";
import { FlaskConical, LineChart } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
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
import { DEFAULT_RECIPE } from "@/lib/api/eaf";

export function EafDashboardView() {
  const { loading, error, model, prediction, optimization } = useEafDashboard(DEFAULT_RECIPE);

  return (
    <PageContainer
      title="Dashboard"
      description="Executive overview — production model status, research progress, and optimization impact"
    >
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EafKpiCard
          title="Production Model"
          value={loading ? "…" : (model?.model_name ?? "—")}
          subtitle={`${PRODUCTION_MODEL_PHASE} — deployed`}
        />
        <EafKpiCard
          title="Research Status"
          value={RESEARCH_VERSION}
          subtitle="Experimental — not for live decisions"
          valueClassName="text-lg"
        />
        <EafKpiCard
          title="Current Version"
          value={`v${APP_VERSION}`}
          subtitle={`Optimizer ${OPTIMIZER_PHASE}`}
        />
        <EafKpiCard
          title="Latest Phase"
          value="Phase 28"
          subtitle="Website enhancement & research integration"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EafKpiCard
          title="Expected MAE"
          value={loading ? "…" : `${model?.test_mae?.toFixed(2) ?? "—"} min`}
          subtitle="Production test-set MAE (normal heats)"
        />
        <EafKpiCard
          title="Digital Twin Readiness"
          value="V1"
          subtitle="Production website only — V2 needs P0 sensors"
          valueClassName="text-lg"
        />
        <EafKpiCard
          title="Data Quality"
          value={loading ? "…" : (prediction?.operator_summary?.process_status ?? "—")}
          subtitle="Reference recipe process status"
        />
        <EafKpiCard
          title="Industrial Coverage"
          value="~65%"
          subtitle="Phase 27 gap analysis — P0 tags missing"
          valueClassName="text-lg"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <EafKpiCard
          title="Current Recipe Prediction"
          value={loading ? "…" : `${prediction?.predicted_ttt?.toFixed(2) ?? "—"} min`}
          valueClassName="text-primary"
          subtitle={
            prediction
              ? `95% CI: ${prediction.ci_lower_95.toFixed(1)} – ${prediction.ci_upper_95.toFixed(1)} min`
              : undefined
          }
        />
        <EafKpiCard
          title="Optimized Prediction"
          value={loading ? "…" : `${optimization?.optimized_ttt?.toFixed(2) ?? "—"} min`}
          valueClassName="text-primary"
          subtitle={optimization?.physics_compliant ? "Physics compliant" : "Review physics constraints"}
        />
        <EafKpiCard
          title="Estimated Saving"
          value={loading ? "…" : `${optimization?.improvement_min?.toFixed(2) ?? "—"} min`}
          valueClassName="text-green-600"
          subtitle="Tap-to-tap improvement vs current recipe"
        />
      </div>

      {prediction ? (
        <SectionCard title="Operator Summary">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-label">Confidence</p>
              <p className="text-xl font-semibold">{prediction.operator_summary?.confidence}</p>
            </div>
            <div>
              <p className="text-label">Expected Quality</p>
              <p className="text-xl font-semibold">{prediction.operator_summary?.expected_quality}</p>
            </div>
            <div>
              <p className="text-label">Risk</p>
              <p className="text-xl font-semibold">{prediction.operator_summary?.risk}</p>
            </div>
            <div>
              <p className="text-label">Total Charge</p>
              <p className="text-xl font-semibold font-mono">
                {(DEFAULT_RECIPE.HM + DEFAULT_RECIPE.DRI + DEFAULT_RECIPE.HBI + DEFAULT_RECIPE.Bucket).toFixed(1)} t
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ContributorList contributors={prediction?.top_contributors ?? []} limit={5} />
        <SectionCard title="Research Center" description="Phases 23–27 findings — does not affect production">
          <p className="text-sm text-muted-foreground">
            Leakage analysis, two-stage architecture, feature discovery, industrial roadmap, and digital twin planning.
          </p>
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

      <SectionCard title="Model Insights" description="SHAP attribution and production metadata" className="mt-4">
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
