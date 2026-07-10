"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { opsApi } from "@/lib/api/ops";
import { getApiErrorMessage } from "@/services/api-client";

export function ProductionManagerOpsView() {
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [shift, setShift] = useState<Record<string, unknown> | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([opsApi.productionDash(), opsApi.shiftPerf(), opsApi.analytics()])
      .then(([d, s, a]) => {
        setDash(d.data as Record<string, unknown>);
        setShift(s.data as Record<string, unknown>);
        setAnalytics(a.data as Record<string, unknown>);
      })
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load dashboard")));
  }, []);

  const live = (dash?.live_queue || {}) as Record<string, number>;
  const approvals = (dash?.approval_backlog || []) as { id: string; heat_number: string; stage: string }[];
  const delays = (dash?.open_delays || []) as { id: string; heat_number?: string; category: string }[];
  const running = (dash?.running_heats || []) as { heat_number: string; furnace_id?: string }[];

  return (
    <PageContainer title="Production Manager" description="Live production, backlogs, shift KPIs, analytics">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(live).map(([k, v]) => (
          <SectionCard key={k} title={k}>
            <p className="text-2xl font-semibold tabular-nums">{v}</p>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Shift performance">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {shift
              ? Object.entries(shift).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                    <dd className="font-medium tabular-nums">{String(v ?? "—")}</dd>
                  </div>
                ))
              : null}
          </dl>
        </SectionCard>

        <SectionCard title="Analytics">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Heat throughput</dt>
              <dd className="text-xl font-semibold">{String(analytics?.heat_throughput ?? "—")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Open tasks</dt>
              <dd className="text-xl font-semibold">
                {String((analytics?.operator_utilization as { open_tasks?: number } | undefined)?.open_tasks ?? "—")}
              </dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline"><Link href="/eaf/approvals">Approvals</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/eaf/heat-queue">Queue</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/eaf/delays">Delays</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/eaf/ops-reports">Reports</Link></Button>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Running heats">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Furnace</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {running.map((r) => (
              <EnterpriseTableRow key={r.heat_number}>
                <EnterpriseTableCell>{r.heat_number}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.furnace_id || "—"}</EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Approval backlog">
          <ul className="space-y-1 text-sm">
            {approvals.map((a) => (
              <li key={a.id}>{a.heat_number} · {a.stage}</li>
            ))}
            {!approvals.length ? <li className="text-muted-foreground">Clear</li> : null}
          </ul>
        </SectionCard>
        <SectionCard title="Open delays (heatmap source)">
          <ul className="space-y-1 text-sm">
            {delays.map((d) => (
              <li key={d.id}>{d.category} · {d.heat_number || "—"}</li>
            ))}
            {!delays.length ? <li className="text-muted-foreground">None</li> : null}
          </ul>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
