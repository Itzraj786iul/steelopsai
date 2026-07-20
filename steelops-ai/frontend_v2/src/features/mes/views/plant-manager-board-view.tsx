"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  CalendarRange,
  ListOrdered,
  ClipboardCheck,
  Gauge,
  FileText,
} from "lucide-react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ShortcutBar } from "@/components/layout/shortcut-bar";
import { KpiStrip, humanizeKey } from "@/components/layout/kpi-strip";
import { Button } from "@/components/ui/button";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

function formatMetric(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(2);
  return String(v);
}

export function PlantManagerBoardView() {
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    mesApi
      .plantBoard()
      .then(({ data }) => setBoard(data as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load plant board")))
      .finally(() => setLoading(false));
  }, []);

  const today = (board?.today || {}) as Record<string, unknown>;
  const shifts = (board?.shift_comparison || {}) as Record<string, Record<string, unknown>>;
  const util = (board?.furnace_utilization || {}) as Record<string, Record<string, unknown>>;
  const targets = board?.targets as { summary?: Record<string, unknown> | Record<string, unknown>[] } | undefined;
  const targetSummary = (targets?.summary ?? targets) as Record<string, unknown> | Record<string, unknown>[] | undefined;

  return (
    <PageContainer
      title="Plant Overview"
      description="Plant-level home — today, shift & furnace comparison. Oversight only (no heat console)."
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/eaf/reports">Reports</Link>
        </Button>
      }
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      <ShortcutBar
        title="Do next"
        description="Oversight actions"
        items={[
          { href: "/eaf/live-board", label: "Live Board", icon: LayoutGrid },
          { href: "/eaf/production-plan", label: "Production Plan", icon: CalendarRange },
          { href: "/eaf/heat-queue", label: "Heat Queue", icon: ListOrdered },
          { href: "/eaf/approvals", label: "Approvals", icon: ClipboardCheck },
          { href: "/eaf/shift-dashboard", label: "Shift Analytics", icon: Gauge },
          { href: "/eaf/reports", label: "Reports", variant: "ghost", icon: FileText },
        ]}
      />

      {loading && !board ? (
        <p className="text-sm text-muted-foreground">Loading plant overview…</p>
      ) : (
        <KpiStrip
          items={[
            { label: "Today production", value: formatMetric(today.today_production) },
            { label: "Avg cycle time", value: formatMetric(today.average_ttt) },
            { label: "Avg saving", value: formatMetric(today.average_saving) },
            { label: "Running", value: formatMetric(today.running_heats), highlight: true },
          ]}
        />
      )}

      <SectionCard title="Shift comparison">
        {Object.keys(shifts).length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(shifts).map(([code, sc]) => (
              <div
                key={code}
                className="rounded-lg border border-border/70 bg-muted/15 p-4 text-sm shadow-elevation-sm"
              >
                <p className="mb-3 text-heading-sm">Shift {code}</p>
                <dl className="space-y-2">
                  {(
                    [
                      ["Completed", sc.completed],
                      ["Avg cycle time", sc.average_ttt],
                      ["Delay %", sc.delay_pct],
                      ["Acceptance", sc.recommendation_acceptance],
                    ] as [string, unknown][]
                  ).map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-mono font-medium tabular-nums">{formatMetric(val)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No shift comparison yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Furnace utilization (daily)">
        {Object.keys(util).length ? (
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(util).map(([f, u]) => (
              <div
                key={f}
                className="rounded-lg border border-border/70 bg-muted/15 p-4 text-sm shadow-elevation-sm"
              >
                <p className="mb-3 font-semibold">{f}</p>
                <dl className="space-y-2">
                  {(
                    [
                      ["Util %", u.utilization_pct],
                      ["Running h", u.running_hours],
                      ["Idle h", u.idle_hours],
                      ["Delay h", u.delay_hours],
                    ] as [string, unknown][]
                  ).map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="font-mono font-medium tabular-nums">{formatMetric(val)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No furnace data yet.</p>
        )}
      </SectionCard>

      <SectionCard title="Targets vs actual" description="Configured plant targets compared to period actuals">
        {targetSummary && !Array.isArray(targetSummary) && typeof targetSummary === "object" ? (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(targetSummary).map(([k, v]) => (
              <div key={k} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                <dt className="text-xs text-muted-foreground">{humanizeKey(k)}</dt>
                <dd className="mt-0.5 font-mono text-base font-semibold tabular-nums">
                  {typeof v === "object" && v !== null
                    ? formatMetric((v as { actual?: unknown; target?: unknown }).actual ?? (v as { value?: unknown }).value ?? JSON.stringify(v))
                    : formatMetric(v)}
                </dd>
              </div>
            ))}
          </dl>
        ) : Array.isArray(targetSummary) && targetSummary.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {targetSummary.map((row, i) => (
              <div key={i} className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                {Object.entries(row).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 py-0.5">
                    <span className="text-muted-foreground">{humanizeKey(k)}</span>
                    <span className="font-mono tabular-nums">{formatMetric(v)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No targets configured for this period.</p>
        )}
      </SectionCard>
    </PageContainer>
  );
}
