"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
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

  return (
    <PageContainer title="Live Shift Board" description={`Auto-refresh 30s · Furnace ${furnaceId}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Last refresh: {refreshed?.slice(0, 19) || "—"}</p>
        <Button size="sm" variant="outline" onClick={() => load()}>Refresh now</Button>
      </div>
      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {COLS.map((col) => (
          <SectionCard key={col} title={`${col.replace(/([A-Z])/g, " $1").trim()} (${counts[col] ?? 0})`}>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {(columns[col] || []).map((h) => (
                <div
                  key={h.id}
                  className={cn(
                    "rounded-md border border-border/70 bg-card p-3 shadow-sm",
                    col === "Delayed" && "border-destructive/50",
                    col === "Running" && "border-emerald-600/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <Link href={`/eaf/heat-scheduler`} className="font-semibold text-sm hover:underline">
                      {h.heat_number}
                    </Link>
                    <Badge variant="outline" className="text-[10px]">{h.priority || "—"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {h.assigned_furnace} · Shift {h.assigned_shift}
                  </p>
                  <p className="text-xs">{h.target_grade || "—"} · {h.status}</p>
                </div>
              ))}
              {!(columns[col] || []).length ? (
                <p className="text-xs text-muted-foreground">Empty</p>
              ) : null}
            </div>
          </SectionCard>
        ))}
      </div>
    </PageContainer>
  );
}
