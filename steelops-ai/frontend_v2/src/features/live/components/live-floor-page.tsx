"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { LiveConnectionBadge } from "@/features/live/components/live-connection-badge";
import { normalizeLiveList, formatElapsed } from "@/features/live/utils/live-utils";
import { liveApi } from "@/lib/api/live";
import { queryKeys } from "@/lib/query-keys";

export function LiveFloorPage() {
  const query = useQuery({
    queryKey: queryKeys.live.heats,
    queryFn: async () => (await liveApi.listHeats()).data,
    refetchInterval: 15_000,
  });

  if (query.isLoading) {
    return (
      <DashboardLayout>
        <PageLoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (query.isError) {
    return (
      <DashboardLayout>
        <ErrorState message="Unable to load live heats." onRetry={() => query.refetch()} />
      </DashboardLayout>
    );
  }

  const { items, total } = normalizeLiveList(query.data ?? { items: [] });

  return (
    <DashboardLayout>
      <PageHeader
        title="Live execution"
        description="Active heats on the floor. Select a heat to open the control-room workspace."
        actions={<LiveConnectionBadge />}
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{total} active heat(s)</p>
        <ActionButton asChild>
          <Link href="/copilot">Open Copilot</Link>
        </ActionButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((heat, index) => (
          <motion.div
            key={heat.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <Link
              href={`/live/${heat.id}`}
              className="block rounded-2xl border border-border/80 bg-card/60 p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Flame className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{heat.heat_number}</p>
                    <p className="text-xs text-muted-foreground">{heat.operator_name ?? "Unassigned"} · Shift {heat.shift ?? "—"}</p>
                  </div>
                </div>
                <StatusBadge status={heat.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <Metric label="Elapsed" value={formatElapsed(heat.elapsed_seconds ?? 0)} />
                <Metric label="Health" value={heat.health_score?.toFixed(0) ?? "—"} />
                <Metric label="Alerts" value={String(heat.alert_count ?? 0)} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">No active heats. Start a heat from Copilot to begin live execution.</p>
          <ActionButton className="mt-4" asChild>
            <Link href="/copilot">Go to Copilot</Link>
          </ActionButton>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/25 px-2 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
