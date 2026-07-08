"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ConfidenceRing } from "@/components/industrial/gauges";
import { ContributorList } from "@/features/eaf/components/contributor-list";
import { FeatureImportanceChart } from "@/features/eaf/components/feature-importance-chart";
import { useEafModelInfo } from "@/features/eaf/hooks/use-eaf";
import { DEFAULT_RECIPE, eafApi, type PredictResponse } from "@/lib/api/eaf";

export function ModelInsightsView() {
  const { info, loading: modelLoading } = useEafModelInfo();
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);

  useEffect(() => {
    eafApi.predict(DEFAULT_RECIPE).then(({ data }) => setPrediction(data)).catch(() => undefined);
  }, []);

  if (modelLoading && !info) {
    return (
      <PageContainer title="Model Insights" description="Loading production model metadata…">
        {null}
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Model Insights"
      description="Frozen Phase 19 ensemble model — feature importance, SHAP attribution, and prediction explanation"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Model">
          <p className="text-2xl font-semibold">{info?.model_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{info?.dataset}</p>
        </SectionCard>
        <SectionCard title="Test MAE">
          <p className="font-mono text-3xl font-bold">{info?.test_mae} min</p>
        </SectionCard>
        <SectionCard title="Test R²">
          <p className="font-mono text-3xl font-bold">{info?.test_r2}</p>
        </SectionCard>
        <SectionCard title="Features">
          <p className="font-mono text-3xl font-bold">{info?.n_features}</p>
        </SectionCard>
        <SectionCard title="Optimizer">
          <p className="text-lg font-medium">{info?.optimizer_version}</p>
        </SectionCard>
        <SectionCard title="95% Confidence Interval">
          <p className="font-mono text-3xl font-bold">± {info?.ci_half_width_95} min</p>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeatureImportanceChart contributors={prediction?.top_contributors ?? []} title="SHAP Summary" />
        <ContributorList
          title="Top Contributors"
          description="Local SHAP-style attribution at the default operating recipe"
          contributors={prediction?.top_contributors ?? []}
          limit={10}
        />
      </div>

      {prediction ? (
        <SectionCard title="Prediction Explanation" description="Interpretation for the reference heat recipe">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="font-mono text-4xl font-bold text-primary">{prediction.predicted_ttt.toFixed(2)} min</p>
              <p className="text-sm text-muted-foreground">
                95% interval: {prediction.ci_lower_95.toFixed(1)} – {prediction.ci_upper_95.toFixed(1)} min
              </p>
              <p className="text-sm">
                <span className="text-label">Status:</span> {prediction.operator_summary?.process_status}
              </p>
              <p className="text-sm">
                <span className="text-label">Confidence:</span> {prediction.operator_summary?.confidence}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ConfidenceRing
                score={85}
                tier={prediction.operator_summary?.confidence?.toUpperCase() ?? "HIGH"}
              />
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Model Information" description="Production artifacts and feature schema">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-label">Artifacts</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {info?.artifacts
                ? Object.entries(info.artifacts).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium text-foreground">{key}:</span> {value}
                    </li>
                  ))
                : null}
            </ul>
          </div>
          <div>
            <p className="text-label">Feature List ({info?.features?.length ?? 0})</p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {info?.features?.map((f) => (
                <li key={f} className="font-mono text-muted-foreground">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
