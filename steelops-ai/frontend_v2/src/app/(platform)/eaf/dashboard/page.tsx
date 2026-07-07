"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { eafApi } from "@/lib/api/eaf";
import { useEafPredict, useEafRecipe } from "@/features/eaf/hooks/use-eaf";

export default function EafDashboardPage() {
  const { recipe, charge } = useEafRecipe();
  const { predict, result } = useEafPredict();
  const [model, setModel] = useState<{ test_mae: number; test_r2: number; optimizer_version: string } | null>(null);

  useEffect(() => {
    eafApi.modelInfo().then(({ data }) => setModel(data));
    predict(recipe).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PageContainer title="EAF Dashboard" description="JSPL Tap-to-Tap Decision Support">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SectionCard title="Current Prediction" className="text-center">
          <p className="font-mono text-4xl font-bold text-primary">
            {result?.predicted_ttt?.toFixed(2) ?? "—"} <span className="text-lg">min</span>
          </p>
        </SectionCard>
        <SectionCard title="Total Charge">
          <p className="font-mono text-3xl font-semibold">{charge.toFixed(1)} t</p>
        </SectionCard>
        <SectionCard title="Model MAE">
          <p className="font-mono text-3xl font-semibold">{model?.test_mae?.toFixed(2) ?? "3.06"} min</p>
        </SectionCard>
        <SectionCard title="Optimizer">
          <p className="text-sm font-medium">{model?.optimizer_version ?? "Phase 20.2"}</p>
          <p className="mt-2 text-xs text-muted-foreground">Physics-guided local search</p>
        </SectionCard>
      </div>
      {result ? (
        <SectionCard title="Operator Summary" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><p className="text-label">Status</p><p className="text-xl font-semibold text-green-600">{result.operator_summary?.process_status}</p></div>
            <div><p className="text-label">Confidence</p><p className="text-xl font-semibold">{result.operator_summary?.confidence}</p></div>
            <div><p className="text-label">Quality</p><p className="text-xl font-semibold">{result.operator_summary?.expected_quality}</p></div>
            <div><p className="text-label">Risk</p><p className="text-xl font-semibold">{result.operator_summary?.risk}</p></div>
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
