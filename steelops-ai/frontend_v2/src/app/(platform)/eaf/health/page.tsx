"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { IndustrialGauge, HeatHealthRing } from "@/components/industrial/gauges";
import { eafApi, DEFAULT_RECIPE } from "@/lib/api/eaf";

const COLOR_MAP = { green: "#1B7A3D", yellow: "#C9A227", red: "#B83232" };

export default function EafHealthPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof eafApi.processHealth>>["data"]["items"]>([]);

  useEffect(() => {
    eafApi.processHealth(DEFAULT_RECIPE).then(({ data }) => setItems(data.items));
  }, []);

  return (
    <PageContainer title="Process Health" description="Operating window status for key process variables">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <SectionCard key={item.gauge} title={item.gauge}>
            <div className="flex items-center justify-between">
              <HeatHealthRing
                score={item.color === "green" ? 88 : item.color === "yellow" ? 55 : 30}
                band={item.status}
                size={64}
              />
              <p className="text-sm font-medium" style={{ color: COLOR_MAP[item.color as keyof typeof COLOR_MAP] }}>
                {item.status}
              </p>
            </div>
            <IndustrialGauge
              className="mt-4"
              label="vs operating band"
              value={item.value}
              min={item.p5}
              max={item.p95}
              color={COLOR_MAP[item.color as keyof typeof COLOR_MAP] ?? COLOR_MAP.yellow}
            />
          </SectionCard>
        ))}
      </div>
    </PageContainer>
  );
}
