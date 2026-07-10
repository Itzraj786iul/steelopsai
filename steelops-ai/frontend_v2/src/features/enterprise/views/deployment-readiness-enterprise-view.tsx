"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { TrafficLightBadge } from "@/features/enterprise/components/traffic-light-badge";
import { buildDeploymentChecklist, overallChecklistStatus } from "@/lib/deployment-checklist";
import { eafApi, type DeploymentReadiness } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { useAuditStore } from "@/stores/audit-store";

export function DeploymentReadinessEnterpriseView() {
  const auditCount = useAuditStore((s) => s.predictionAudits.length);
  const [backend, setBackend] = useState({ online: false, model: false });
  const [apiData, setApiData] = useState<DeploymentReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eafApi
      .health()
      .then(({ data }) => setBackend({ online: data.status === "ok", model: data.model_loaded }))
      .catch(() => setBackend({ online: false, model: false }));
    eafApi
      .deploymentReadiness()
      .then(({ data }) => setApiData(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "API readiness unavailable")));
  }, []);

  const checklist = buildDeploymentChecklist({
    backendOnline: backend.online,
    modelLoaded: backend.model,
    frontendBuilt: true,
    hasAudits: auditCount > 0,
    hasValidation: auditCount > 0,
    docsComplete: true,
  });

  const overall = overallChecklistStatus(checklist);

  return (
    <PageContainer title="Deployment Readiness" description="Enterprise deployment checklist with traffic-light status">
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      <SectionCard title="Overall Status">
        <div className="flex items-center gap-4">
          <TrafficLightBadge status={overall} />
          {apiData ? <span className="font-mono text-2xl font-bold">{apiData.overall_score.toFixed(0)} / 100</span> : null}
          <span className="text-sm text-muted-foreground">SteelOps AI v1.0.0 enterprise checklist</span>
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checklist.map((item) => (
          <SectionCard key={item.id} title={item.area}>
            <div className="mb-2 flex items-center gap-2">
              <TrafficLightBadge status={item.status} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{item.detail}</p>
          </SectionCard>
        ))}
      </div>

      {apiData ? (
        <SectionCard title="Backend Assessment (Phase 33)" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {apiData.indicators.map((ind) => (
              <div key={ind.area} className="rounded-lg border border-border/60 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <TrafficLightBadge status={ind.status} />
                  <span className="font-medium">{ind.area}</span>
                </div>
                <p className="text-sm text-muted-foreground">{ind.summary}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </PageContainer>
  );
}
