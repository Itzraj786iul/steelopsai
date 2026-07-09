"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { eafApi, type DeploymentReadiness } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

export default function EafDeploymentReadinessPage() {
  const [data, setData] = useState<DeploymentReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eafApi
      .deploymentReadiness()
      .then(({ data: res }) => setData(res))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load readiness assessment")));
  }, []);

  return (
    <PageContainer
      title="Deployment Readiness"
      description="Industrial AI decision support — traffic-light assessment for JSPL demonstration and thesis defense"
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</p>
      ) : null}

      {data ? (
        <>
          <SectionCard title="Overall readiness">
            <div className="flex flex-wrap items-center gap-4">
              <StatusBadge status={data.overall_status} />
              <p className="font-mono text-3xl font-bold">{data.overall_score.toFixed(0)} / 100</p>
              <p className="text-sm text-muted-foreground">Generated {data.generated_at.slice(0, 10)}</p>
            </div>
          </SectionCard>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {data.indicators.map((ind) => (
              <SectionCard key={ind.area} title={ind.area}>
                <div className="mb-2 flex items-center gap-2">
                  <StatusBadge status={ind.status} />
                  {ind.score != null ? <span className="font-mono text-sm">{ind.score.toFixed(0)} / 100</span> : null}
                </div>
                <p className="text-sm text-muted-foreground">{ind.summary}</p>
                {ind.recommendations?.length ? (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                    {ind.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
              </SectionCard>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading assessment…</p>
      )}
    </PageContainer>
  );
}

function StatusBadge({ status }: { status: "green" | "yellow" | "red" }) {
  const label = status === "green" ? "Ready" : status === "yellow" ? "Developing" : "At Risk";
  const variant = status === "green" ? "default" : status === "yellow" ? "secondary" : "destructive";
  return <Badge variant={variant}>{label}</Badge>;
}
