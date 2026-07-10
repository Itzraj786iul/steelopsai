"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrafficLightBadge } from "@/features/enterprise/components/traffic-light-badge";
import { eafApi } from "@/lib/api/eaf";
import { avgLatency, performanceSummary, usePerformanceStore } from "@/stores/performance-store";
import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { useAuditStore } from "@/stores/audit-store";

export function SystemHealthView() {
  const samples = usePerformanceStore((s) => s.samples);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);
  const auditCount = useAuditStore((s) => s.predictionAudits.length);
  const [backend, setBackend] = useState<{ ok: boolean; model: boolean; optimizer: boolean } | null>(null);
  const [histOk, setHistOk] = useState<boolean | null>(null);

  useEffect(() => {
    eafApi
      .health()
      .then(({ data }) => setBackend({ ok: data.status === "ok", model: data.model_loaded, optimizer: true }))
      .catch(() => setBackend({ ok: false, model: false, optimizer: false }));
    eafApi
      .historical({ HM: 56, DRI: 63, HBI: 0, Bucket: 12, LIME: 2, DOLO: 2.5, CPC: 400, POWER: 32000, OXY: 3500, Shift: "B", Power_Restriction: 0 })
      .then(() => setHistOk(true))
      .catch(() => setHistOk(false));
  }, []);

  const perf = performanceSummary(samples);
  const storageKb = Math.round(perf.largestSessionBytes / 1024);
  const memMb =
    typeof performance !== "undefined" && "memory" in performance
      ? Math.round(((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0) / 1048576)
      : null;

  return (
    <PageContainer title="System Health" description="Client-side monitoring — backend, session store, and latency">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HealthCard title="Backend" loading={!backend} status={backend?.ok ? "green" : "red"} detail={backend?.ok ? "API reachable" : "Offline"} />
        <HealthCard title="Model" loading={!backend} status={backend?.model ? "green" : "red"} detail={backend?.model ? "Phase 19 loaded" : "Not loaded"} />
        <HealthCard title="Optimizer" loading={!backend} status={backend?.optimizer ? "green" : "yellow"} detail="Phase 20.2 via API" />
        <HealthCard title="Historical Statistics" loading={histOk === null} status={histOk ? "green" : "yellow"} detail={histOk ? "Historical API OK" : "Unavailable"} />
        <HealthCard title="Session Store" status="green" detail={`${sessionHistory.length} heats · ${auditCount} audits`} />
        <HealthCard title="Local Storage" status={storageKb < 4096 ? "green" : "yellow"} detail={`~${storageKb} KB JSPL data`} />
      </div>

      <SectionCard title="Latency (client-measured)" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LatencyStat label="API / Prediction" ms={avgLatency("prediction", samples)} />
          <LatencyStat label="Optimizer" ms={avgLatency("optimizer", samples)} />
          <LatencyStat label="Hybrid Evaluation" ms={avgLatency("hybrid", samples)} />
          <LatencyStat label="Browser Memory" ms={null} extra={memMb != null ? `${memMb} MB heap` : "N/A"} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{perf.sampleCount} samples recorded locally. No polling — measured on operator actions only.</p>
      </SectionCard>
    </PageContainer>
  );
}

function HealthCard({ title, status, detail, loading }: { title: string; status: "green" | "yellow" | "red"; detail: string; loading?: boolean }) {
  return (
    <SectionCard title={title}>
      {loading ? <Skeleton className="h-8 w-24" /> : (
        <>
          <TrafficLightBadge status={status} />
          <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        </>
      )}
    </SectionCard>
  );
}

function LatencyStat({ label, ms, extra }: { label: string; ms: number | null; extra?: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-xl font-bold">{extra ?? (ms != null ? `${ms.toFixed(0)} ms` : "—")}</p>
    </div>
  );
}
