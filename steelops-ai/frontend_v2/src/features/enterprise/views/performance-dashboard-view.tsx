"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { performanceSummary, usePerformanceStore } from "@/stores/performance-store";

export function PerformanceDashboardView() {
  const samples = usePerformanceStore((s) => s.samples);
  const clear = usePerformanceStore((s) => s.clear);
  const perf = performanceSummary(samples);

  return (
    <PageContainer title="Performance Dashboard" description="Client-side latency and session metrics — no backend polling">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PerfCard label="Avg Prediction Time" value={fmtMs(perf.avgPredictionMs)} />
        <PerfCard label="Avg Optimizer Time" value={fmtMs(perf.avgOptimizerMs)} />
        <PerfCard label="Avg Hybrid Time" value={fmtMs(perf.avgHybridMs)} />
        <PerfCard label="Avg Page Load" value={fmtMs(perf.avgPageLoadMs)} />
        <PerfCard label="Largest Session" value={`${Math.round(perf.largestSessionBytes / 1024)} KB`} />
        <PerfCard label="Cache Hit Rate" value={perf.cacheHitRate != null ? `${perf.cacheHitRate.toFixed(0)}%` : "—"} />
      </div>

      <SectionCard title="Sample Log" className="mt-6">
        {!samples.length ? (
          <p className="text-sm text-muted-foreground">No performance samples yet. Run predictions or optimizations to record timings.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            <table className="enterprise-table w-full text-xs">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-2 py-1">Time</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Latency</th>
                </tr>
              </thead>
              <tbody>
                {samples.slice(0, 50).map((s, i) => (
                  <tr key={`${s.timestamp}-${i}`} className="border-b border-border/40">
                    <td className="px-2 py-1">{new Date(s.timestamp).toLocaleTimeString()}</td>
                    <td className="px-2 py-1 capitalize">{s.type.replace("_", " ")}</td>
                    <td className="px-2 py-1 font-mono">{s.ms.toFixed(0)} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button variant="outline" size="sm" className="mt-4" onClick={clear} disabled={!samples.length}>
          Clear samples
        </Button>
      </SectionCard>
    </PageContainer>
  );
}

function PerfCard({ label, value }: { label: string; value: string }) {
  return (
    <SectionCard title={label}>
      <p className="font-mono text-3xl font-bold">{value}</p>
    </SectionCard>
  );
}

function fmtMs(v: number | null) {
  return v != null ? `${v.toFixed(0)} ms` : "—";
}
