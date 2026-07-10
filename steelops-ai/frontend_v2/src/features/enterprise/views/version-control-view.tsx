"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { BUILD_DATE, GIT_COMMIT, VERSION_REGISTRY } from "@/lib/enterprise-versions";
import { APP_VERSION, EAF_API_URL } from "@/lib/constants";
import { useEafModelInfo } from "@/features/eaf/hooks/use-eaf";

export function VersionControlView() {
  const { info, loading } = useEafModelInfo();

  return (
    <PageContainer title="Version Control" description="Exact version of every deployed component">
      <SectionCard title="Build Metadata">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Build Date" value={BUILD_DATE} />
          <Meta label="Git Commit" value={GIT_COMMIT} mono />
          <Meta label="API Endpoint" value={EAF_API_URL} mono />
          <Meta label="Live Model" value={loading ? "…" : info?.model_name ?? "—"} mono />
        </dl>
      </SectionCard>

      <SectionCard title="Component Registry" className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {VERSION_REGISTRY.map((row) => (
            <div key={row.component} className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3 transition-colors duration-200 hover:bg-muted/30">
              <div>
                <p className="font-medium">{row.component}</p>
                <Badge variant="outline" className="mt-1 text-[10px] capitalize">{row.status}</Badge>
              </div>
              <p className="font-mono text-sm font-semibold">{row.version}</p>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-3">
            <p className="font-medium">Backend Runtime</p>
            <p className="font-mono text-sm">{info?.optimizer_version ?? `v${APP_VERSION}`}</p>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold ${mono ? "font-mono break-all" : ""}`}>{value}</dd>
    </div>
  );
}
