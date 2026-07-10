"use client";

import { useEffect, useState } from "react";

import { SectionCard } from "@/components/layout/section-card";
import { mesApi } from "@/lib/api/mes";

/** Database-driven MES widgets for the main operations dashboard. */
export function MesDashboardWidgets() {
  const [widgets, setWidgets] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    mesApi
      .dashboardWidgets()
      .then(({ data }) => setWidgets(data as Record<string, unknown>))
      .catch(() => setWidgets(null));
  }, []);

  if (!widgets) return null;

  const kpi = (widgets.kpi_wall || {}) as Record<string, unknown>;
  const counts = (widgets.live_board_counts || {}) as Record<string, number>;
  const util = (widgets.furnace_utilization || {}) as Record<string, unknown>;

  return (
    <SectionCard title="MES production widgets" description="Heat Management + MES database">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Today production</p>
          <p className="text-xl font-semibold tabular-nums">{String(kpi.today_production ?? "—")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Running / Delayed</p>
          <p className="text-xl font-semibold tabular-nums">
            {counts.Running ?? 0} / {counts.Delayed ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Pending validation</p>
          <p className="text-xl font-semibold tabular-nums">{String(kpi.pending_validation ?? "—")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Furnace util %</p>
          <p className="text-xl font-semibold tabular-nums">{String(util.utilization_pct ?? "—")}</p>
        </div>
      </div>
    </SectionCard>
  );
}
