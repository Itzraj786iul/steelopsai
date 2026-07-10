"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

export function PlantManagerBoardView() {
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mesApi
      .plantBoard()
      .then(({ data }) => setBoard(data as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load plant board")));
  }, []);

  const today = (board?.today || {}) as Record<string, unknown>;
  const shifts = (board?.shift_comparison || {}) as Record<string, Record<string, unknown>>;
  const util = (board?.furnace_utilization || {}) as Record<string, Record<string, unknown>>;
  const targets = board?.targets as { summary?: Record<string, unknown> | Record<string, unknown>[] } | undefined;

  return (
    <PageContainer title="Plant Manager Board" description="Today · weekly/monthly trends · shift & furnace comparison">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Today production", today.today_production],
          ["Avg TTT", today.average_ttt],
          ["Avg saving", today.average_saving],
          ["Running", today.running_heats],
        ].map(([l, v]) => (
          <SectionCard key={String(l)} title={String(l)}>
            <p className="text-2xl font-semibold tabular-nums">{String(v ?? "—")}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Shift comparison" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(shifts).map(([code, sc]) => (
            <div key={code} className="rounded border border-border/60 p-3 text-sm">
              <p className="font-semibold mb-2">Shift {code}</p>
              <p>Completed: {String(sc.completed ?? "—")}</p>
              <p>Avg TTT: {String(sc.average_ttt ?? "—")}</p>
              <p>Delay %: {String(sc.delay_pct ?? "—")}</p>
              <p>Acceptance: {String(sc.recommendation_acceptance ?? "—")}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Furnace utilization (daily)" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(util).map(([f, u]) => (
            <div key={f} className="rounded border border-border/60 p-3 text-sm">
              <p className="font-semibold">{f}</p>
              <p>Util %: {String(u.utilization_pct ?? "—")}</p>
              <p>Running h: {String(u.running_hours ?? "—")}</p>
              <p>Idle h: {String(u.idle_hours ?? "—")}</p>
              <p>Delay h: {String(u.delay_hours ?? "—")}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Targets vs actual" className="mt-4">
        <pre className="max-h-48 overflow-auto text-xs">{JSON.stringify(targets?.summary ?? targets, null, 2)}</pre>
      </SectionCard>
    </PageContainer>
  );
}
