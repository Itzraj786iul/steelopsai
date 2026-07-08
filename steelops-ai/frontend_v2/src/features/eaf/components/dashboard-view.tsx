"use client";

import Link from "next/link";
import { LineChart } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { EafKpiCard } from "@/features/eaf/components/eaf-kpi-card";
import { EafQuickActions } from "@/features/eaf/components/eaf-quick-actions";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { useEafDashboard } from "@/features/eaf/hooks/use-eaf";
import { DEFAULT_RECIPE } from "@/lib/api/eaf";

export function EafDashboardView() {
  const { loading, error, model, prediction, optimization } = useEafDashboard(DEFAULT_RECIPE);

  return (
    <PageContainer
      title="Dashboard"
      description="Executive overview — model performance, predictions, and optimization impact for the current heat recipe"
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <EafKpiCard
          title="Current Model"
          value={loading ? "…" : (model?.model_name ?? "—")}
          subtitle={model?.optimizer_version ? `Optimizer ${model.optimizer_version}` : undefined}
        />
        <EafKpiCard
          title="MAE"
          value={loading ? "…" : `${model?.test_mae?.toFixed(2) ?? "—"} min`}
          subtitle="Test-set mean absolute error"
        />
        <EafKpiCard
          title="R²"
          value={loading ? "…" : (model?.test_r2?.toFixed(3) ?? "—")}
          subtitle="Test-set coefficient of determination"
        />
        <EafKpiCard
          title="Process Status"
          value={loading ? "…" : (prediction?.operator_summary?.process_status ?? "—")}
          valueClassName="text-2xl text-green-600"
          subtitle={prediction?.operator_summary?.risk ? `Risk: ${prediction.operator_summary.risk}` : undefined}
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
        <SectionCard
          title="Model Insights"
          description="Feature attribution and model metadata for the current operating point"
        >
          <p className="text-sm text-muted-foreground">
            Explore SHAP contributors, global feature importance, confidence intervals, and frozen production model
            artifacts.
          </p>
          <ActionButton className="mt-4" variant="outline" asChild>
            <Link href="/eaf/model">
              <LineChart className="mr-2 h-4 w-4" />
              Open Model Insights
            </Link>
          </ActionButton>
        </SectionCard>
      </div>

      <EafQuickActions />
    </PageContainer>
  );
}
