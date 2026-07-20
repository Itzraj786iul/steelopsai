"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardCheck, LayoutGrid, ListOrdered, CalendarRange, Target, Gauge } from "lucide-react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ShortcutBar } from "@/components/layout/shortcut-bar";
import { KpiStrip, humanizeKey } from "@/components/layout/kpi-strip";
import { Button } from "@/components/ui/button";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { PAGE_EXPLAINERS } from "@/lib/eaf-glossary";
import { opsApi } from "@/lib/api/ops";
import { getApiErrorMessage } from "@/services/api-client";

const LIVE_KPI_KEYS = [
  "Running",
  "WaitingValidation",
  "Delayed",
  "Completed",
  "Planned",
  "Validated",
] as const;

function pickLiveKpis(live: Record<string, number>) {
  const preferred = LIVE_KPI_KEYS.filter((k) => k in live).map((k) => ({
    label: humanizeKey(k),
    value: live[k],
    highlight: k === "Running",
  }));
  if (preferred.length) return preferred.slice(0, 6);
  return Object.entries(live)
    .slice(0, 6)
    .map(([k, v]) => ({ label: humanizeKey(k), value: v }));
}

export function ProductionManagerOpsView() {
  const router = useRouter();
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [shift, setShift] = useState<Record<string, unknown> | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([opsApi.productionDash(), opsApi.shiftPerf(), opsApi.analytics()])
      .then(([d, s, a]) => {
        setDash(d.data as Record<string, unknown>);
        setShift(s.data as Record<string, unknown>);
        setAnalytics(a.data as Record<string, unknown>);
      })
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load dashboard")))
      .finally(() => setLoading(false));
  }, []);

  const live = (dash?.live_queue || {}) as Record<string, number>;
  const approvals = (dash?.approval_backlog || []) as { id: string; heat_number: string; stage: string }[];
  const delays = (dash?.open_delays || []) as { id: string; heat_number?: string; category: string }[];
  const running = (dash?.running_heats || []) as { heat_number: string; furnace_id?: string }[];

  return (
    <PageContainer
      title="Production Hub"
      description="Today’s production overview — queue, approvals, and heats currently running."
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/eaf/live-board">Open Live Board</Link>
        </Button>
      }
    >
      <PageExplainer {...PAGE_EXPLAINERS.productionHub} />

      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      <ShortcutBar
        title="Do next"
        description="Primary production actions"
        items={[
          { href: "/eaf/live-board", label: "Live Board", icon: LayoutGrid },
          { href: "/eaf/heat-queue", label: "Heat Queue", icon: ListOrdered },
          { href: "/eaf/approvals", label: "Approvals", icon: ClipboardCheck },
          { href: "/eaf/production-plan", label: "Production Plan", icon: CalendarRange },
          { href: "/eaf/prediction", label: "Run heat path", icon: Target },
          { href: "/eaf/shift-dashboard", label: "Shift Analytics", variant: "ghost", icon: Gauge },
        ]}
      />

      {loading && !dash ? (
        <PageLoadingSkeleton />
      ) : (
        <>
          <KpiStrip items={pickLiveKpis(live)} />

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Shift performance">
              {shift ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(shift)
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{humanizeKey(k)}</dt>
                        <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                          {String(v ?? "—")}
                        </dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">No shift metrics yet.</p>
              )}
            </SectionCard>

            <SectionCard
              title="Throughput snapshot"
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/eaf/delays">Delays</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/eaf/reports">Reports</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/eaf/shift-handover">Handover</Link>
                  </Button>
                </div>
              }
            >
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">Heat throughput</dt>
                  <dd className="mt-0.5 font-mono text-xl font-semibold">
                    {String(analytics?.heat_throughput ?? "—")}
                  </dd>
                </div>
                <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">Open tasks</dt>
                  <dd className="mt-0.5 font-mono text-xl font-semibold">
                    {String(
                      (analytics?.operator_utilization as { open_tasks?: number } | undefined)?.open_tasks ??
                        "—"
                    )}
                  </dd>
                </div>
              </dl>
            </SectionCard>
          </div>

          <SectionCard title="Running heats">
            {running.length ? (
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
                      <EnterpriseTableCell>
                        <Link
                          className="font-medium text-primary hover:underline"
                          href={`/eaf/heat-queue?q=${encodeURIComponent(r.heat_number)}`}
                        >
                          {r.heat_number}
                        </Link>
                      </EnterpriseTableCell>
                      <EnterpriseTableCell>{r.furnace_id || "—"}</EnterpriseTableCell>
                    </EnterpriseTableRow>
                  ))}
                </EnterpriseTableBody>
              </EnterpriseTable>
            ) : (
              <EmptyState
                title="No running heats"
                description="When heats are active they appear here with a link into the queue."
                actionLabel="Open Live Board"
                onAction={() => router.push("/eaf/live-board")}
                className="py-10"
              />
            )}
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Approval backlog"
              actions={
                <Button asChild size="sm" variant="ghost">
                  <Link href="/eaf/approvals">View all</Link>
                </Button>
              }
            >
              {approvals.length ? (
                <ul className="divide-y divide-border/60 text-sm">
                  {approvals.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <Link className="font-medium text-primary hover:underline" href="/eaf/approvals">
                        {a.heat_number}
                      </Link>
                      <span className="text-xs text-muted-foreground">{a.stage}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Backlog clear.</p>
              )}
            </SectionCard>
            <SectionCard
              title="Open delays"
              actions={
                <Button asChild size="sm" variant="ghost">
                  <Link href="/eaf/delays">Delay log</Link>
                </Button>
              }
            >
              {delays.length ? (
                <ul className="divide-y divide-border/60 text-sm">
                  {delays.map((d) => (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0"
                    >
                      <span>{d.category}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {d.heat_number || "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No open delays.</p>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </PageContainer>
  );
}
