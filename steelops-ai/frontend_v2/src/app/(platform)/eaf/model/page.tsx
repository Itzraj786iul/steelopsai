"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { eafApi } from "@/lib/api/eaf";

export default function EafModelPage() {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof eafApi.modelInfo>>["data"] | null>(null);

  useEffect(() => {
    eafApi.modelInfo().then(({ data }) => setInfo(data));
  }, []);

  if (!info) return <PageContainer title="Model Information" description="Loading…">{null}</PageContainer>;

  return (
    <PageContainer title="Model Information" description="Frozen Phase 19 production model">
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Model"><p className="text-2xl font-semibold">{info.model_name}</p></SectionCard>
        <SectionCard title="Features"><p className="text-2xl font-semibold">{info.n_features}</p></SectionCard>
        <SectionCard title="Test MAE"><p className="text-2xl font-semibold">{info.test_mae} min</p></SectionCard>
        <SectionCard title="Test R²"><p className="text-2xl font-semibold">{info.test_r2}</p></SectionCard>
        <SectionCard title="Optimizer"><p>{info.optimizer_version}</p></SectionCard>
        <SectionCard title="95% Interval"><p>± {info.ci_half_width_95} min</p></SectionCard>
      </div>
      <SectionCard title="Feature List" className="mt-6">
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {info.features?.map((f) => <li key={f} className="font-mono text-muted-foreground">{f}</li>)}
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
