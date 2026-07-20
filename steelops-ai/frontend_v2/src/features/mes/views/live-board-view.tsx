"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { KpiStrip } from "@/components/layout/kpi-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mesApi } from "@/lib/api/mes";
import { useOpsContextStore } from "@/stores/ops-context-store";
import { getApiErrorMessage } from "@/services/api-client";
import { cn } from "@/lib/utils";

const COLS = ["Planned", "Running", "WaitingValidation", "Validated", "Delayed", "Completed"] as const;

interface HeatCard {
  id: string;
  heat_number: string;
  status: string;
  assigned_furnace?: string;
  assigned_shift?: string;
  target_grade?: string;
  priority?: string;
}

function colLabel(col: string): string {
  return col.replace(/([A-Z])/g, " $1").trim();
}

export function LiveBoardView() {
  const furnaceId = useOpsContextStore((s) => s.furnaceId);
  const [columns, setColumns] = useState<Record<string, HeatCard[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [refreshed, setRefreshed] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    mesApi
      .liveBoard({ furnace_id: furnaceId })
      .then(({ data }) => {
        const d = data as { columns: Record<string, HeatCard[]>; counts: Record<string, number>; refreshed_at: string };
        setColumns(d.columns || {});
        setCounts(d.counts || {});
        setRefreshed(d.refreshed_at);
        setError(null);
      })
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Board load failed")));
  }, [furnaceId]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const totalHeats = Object.values(counts).reduce((a, b) => a + (b || 0), 0);

  return (
    <PageContainer
      title="Live Shift Board"
      description={`Kanban of heats for furnace ${furnaceId} — auto-refresh every 30s`}
      meta={refreshed ? `Last refresh · ${refreshed.slice(0, 19)}` : "Waiting for first refresh…"}
      actions={
        <Button size="sm" variant="outline" onClick={() => load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      }
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      <KpiStrip
        columns={3}
        items={[
          { label: "On board", value: totalHeats },
          { label: "Running", value: counts.Running ?? 0, highlight: true },
          { label: "Delayed", value: counts.Delayed ?? 0 },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {COLS.map((col) => {
          const heats = columns[col] || [];
          return (
            <SectionCard key={col} title={`${colLabel(col)}`} description={`${counts[col] ?? 0} heats`}>
              <div className="max-h-[70vh] space-y-2 overflow-y-auto">
                {heats.map((h) => (
                  <div
                    key={h.id}
                    className={cn(
                      "rounded-md border border-border/70 bg-card p-3 shadow-elevation-sm transition-shadow hover:shadow-elevation-md",
                      col === "Delayed" && "border-destructive/50 bg-destructive/5",
                      col === "Running" && "border-success/40 bg-success/5"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <Link
                        href={`/eaf/heat-queue?q=${encodeURIComponent(h.heat_number)}`}
                        className="text-sm font-semibold hover:underline"
                      >
                        {h.heat_number}
                      </Link>
                      <Badge variant="outline" className="text-[10px]">
                        {h.priority || "—"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.assigned_furnace} · Shift {h.assigned_shift}
                    </p>
                    <p className="text-xs">
                      {h.target_grade || "—"} · {h.status}
                    </p>
                  </div>
                ))}
                {!heats.length ? (
                  <p className="rounded-md border border-dashed border-border/60 px-2 py-6 text-center text-xs text-muted-foreground">
                    No heats
                  </p>
                ) : null}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </PageContainer>
  );
}
