"use client";

import { useEffect, useState } from "react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageExplainer } from "@/components/feedback/page-explainer";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { IndustrialGauge, HeatHealthRing } from "@/components/industrial/gauges";
import { eafApi, DEFAULT_RECIPE } from "@/lib/api/eaf";
import { PAGE_EXPLAINERS } from "@/lib/eaf-glossary";
import { formatVariableLabel } from "@/lib/eaf-labels";

/** Token-aligned gauge colors (industrial success / warning / critical). */
const COLOR_MAP = {
  green: "hsl(var(--success))",
  yellow: "hsl(var(--warning))",
  red: "hsl(var(--destructive))",
};

const GAUGE_LABELS: Record<string, string> = {
  Power: "Electrical Energy",
  Oxygen: "Oxygen",
  HM: "Hot metal",
  DRI: "Direct reduced iron",
  Bucket: "Scrap buckets",
  Flux: "Flux",
};

export default function EafHealthPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof eafApi.processHealth>>["data"]["items"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eafApi
      .processHealth(DEFAULT_RECIPE)
      .then(({ data }) => setItems(data.items))
      .catch(() => setError("Process health data unavailable. Verify the backend is running."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageContainer
      title="Process Health"
      description="Quick check — are the main charge and energy inputs inside the usual plant band?"
    >
      <PageExplainer {...PAGE_EXPLAINERS.health} />
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}
      {loading ? <LoadingSkeleton rows={6} /> : null}
      {!loading && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <SectionCard key={item.gauge} title={GAUGE_LABELS[item.gauge] ?? formatVariableLabel(item.gauge)}>
              <div className="flex items-center justify-between">
                <HeatHealthRing
                  score={item.color === "green" ? 88 : item.color === "yellow" ? 55 : 30}
                  band={item.status}
                  size={64}
                />
                <p
                  className="text-sm font-medium"
                  style={{ color: COLOR_MAP[item.color as keyof typeof COLOR_MAP] }}
                >
                  {item.status}
                </p>
              </div>
              <IndustrialGauge
                className="mt-4"
                label="vs usual plant band"
                value={item.value}
                min={item.p5}
                max={item.p95}
                color={COLOR_MAP[item.color as keyof typeof COLOR_MAP] ?? COLOR_MAP.yellow}
              />
            </SectionCard>
          ))}
        </div>
      ) : null}
    </PageContainer>
  );
}
