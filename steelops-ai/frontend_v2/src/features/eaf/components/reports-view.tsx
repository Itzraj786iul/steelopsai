"use client";

import { useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { useEafHistoryStore } from "@/stores/eaf-history-store";
import { DEFAULT_RECIPE, eafApi } from "@/lib/api/eaf";

async function downloadReport(format: "json" | "csv" | "pdf") {
  const { data } = await eafApi.report(DEFAULT_RECIPE, format);
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data as string], { type: format === "json" ? "application/json" : "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jspl_eaf_report.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

export function ReportsView() {
  const { entries, clear } = useEafHistoryStore();
  const [downloading, setDownloading] = useState<string | null>(null);

  const predictions = entries.filter((e) => e.type === "prediction");
  const optimizations = entries.filter((e) => e.type === "optimization");

  const handleDownload = async (format: "json" | "csv" | "pdf") => {
    setDownloading(format);
    try {
      await downloadReport(format);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <PageContainer
      title="Reports"
      description="Prediction history, optimization records, and exportable decision-support reports"
    >
      <SectionCard title="Export Reports" description="Download full prediction and optimization package for the reference recipe">
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => handleDownload("json")} disabled={!!downloading}>
            {downloading === "json" ? "Preparing…" : "Download JSON"}
          </Button>
          <Button variant="outline" onClick={() => handleDownload("csv")} disabled={!!downloading}>
            {downloading === "csv" ? "Preparing…" : "Download CSV"}
          </Button>
          <Button variant="outline" onClick={() => handleDownload("pdf")} disabled={!!downloading}>
            {downloading === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Prediction History" description="Recent tap-to-tap predictions from this session">
        {predictions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Time</th>
                  <th>Predicted TTT</th>
                  <th>95% Interval</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-2">{formatTimestamp(row.timestamp)}</td>
                    <td className="font-mono">{row.predictedTtt.toFixed(2)} min</td>
                    <td className="font-mono">
                      {row.ciLower.toFixed(1)} – {row.ciUpper.toFixed(1)} min
                    </td>
                    <td>{row.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No predictions recorded yet. Run a prediction from the Prediction page to populate history.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Previous Optimizations" description="Recipe optimization runs from this session">
        {optimizations.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2">Time</th>
                  <th>Current TTT</th>
                  <th>Optimized TTT</th>
                  <th>Saving</th>
                </tr>
              </thead>
              <tbody>
                {optimizations.map((row) => (
                  <tr key={row.id} className="border-b border-border/50">
                    <td className="py-2">{formatTimestamp(row.timestamp)}</td>
                    <td className="font-mono">{row.currentTtt.toFixed(2)} min</td>
                    <td className="font-mono">{row.optimizedTtt.toFixed(2)} min</td>
                    <td className="font-mono text-green-600">{row.savingMin.toFixed(2)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No optimizations recorded yet. Run the Recipe Optimizer to populate history.
          </p>
        )}
        {entries.length ? (
          <Button variant="ghost" size="sm" className="mt-4" onClick={clear}>
            Clear session history
          </Button>
        ) : null}
      </SectionCard>
    </PageContainer>
  );
}
