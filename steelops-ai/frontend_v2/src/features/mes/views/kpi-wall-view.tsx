"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { mesApi } from "@/lib/api/mes";
import { useOpsContextStore } from "@/stores/ops-context-store";
import { getApiErrorMessage } from "@/services/api-client";

export function KpiWallView() {
  const furnaceId = useOpsContextStore((s) => s.furnaceId);
  const [kpi, setKpi] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      mesApi
        .kpiWall(furnaceId)
        .then(({ data }) => setKpi(data as Record<string, unknown>))
        .catch((e: unknown) => setError(getApiErrorMessage(e, "KPI load failed")));
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [furnaceId]);

  const cards = [
    ["Today's Production", kpi?.today_production],
    ["Current Shift", kpi?.current_shift],
    ["Current Furnace", kpi?.current_furnace],
    ["Current Heat", kpi?.current_heat],
    ["Average TTT", kpi?.average_ttt],
    ["Average Saving", kpi?.average_saving],
    ["Current Prediction", kpi?.current_prediction],
    ["Current Reliability", kpi?.current_reliability],
    ["Running Heats", kpi?.running_heats],
    ["Delayed Heats", kpi?.delayed_heats],
    ["Pending Validation", kpi?.pending_validation],
  ] as const;

  return (
    <PageContainer title="Live KPI Wall" description="Industrial production KPIs · 30s refresh">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <SectionCard key={label} title={label}>
            <p className="text-3xl font-semibold tabular-nums tracking-tight">{String(value ?? "—")}</p>
          </SectionCard>
        ))}
      </div>
    </PageContainer>
  );
}
