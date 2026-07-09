"use client";

import { useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CurrentHeatBanner } from "@/features/eaf/components/current-heat-banner";
import {
  APP_VERSION,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";
import { currentCharge, useCurrentHeatStore } from "@/stores/current-heat-store";
import { eafApi } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

async function downloadFromSession(
  format: "json" | "csv" | "pdf",
  active: NonNullable<ReturnType<typeof useCurrentHeatStore.getState>["active"]>
) {
  const recipe = active.recipe;
  const meta = {
    model_version: PRODUCTION_MODEL_PHASE,
    frontend_version: APP_VERSION,
    research_version: RESEARCH_VERSION,
    heat_number: active.heatNumber,
    shift: active.shift,
    generated_at: new Date().toISOString(),
    last_updated: active.lastUpdated,
  };

  if (format === "json") {
    const payload = {
      phase_34_current_heat: meta,
      recipe,
      prediction: active.prediction,
      hybrid: active.hybrid,
      optimizer: active.optimizer,
      optimizer_v2: active.optimizerV2,
      validation: active.validation,
      confidence: active.confidence,
      warnings: active.warnings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jspl_eaf_heat_${active.heatNumber || Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { data } = await eafApi.report(recipe, format);
  const blob =
    data instanceof Blob
      ? data
      : new Blob([data as string], { type: format === "csv" ? "text/csv" : "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jspl_eaf_report_${active.heatNumber || Date.now()}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView() {
  const active = useCurrentHeatStore((s) => s.active);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (format: "json" | "csv" | "pdf") => {
    if (!active?.prediction) return;
    setDownloading(format);
    setError(null);
    try {
      await downloadFromSession(format, active);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Report export failed"));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <PageContainer
      title="Reports"
      description="Export the current heat session — recipe, prediction, optimizer, and hybrid results"
    >
      <CurrentHeatBanner />

      {!active?.prediction ? null : (
        <>
          <SectionCard title="Current heat export" className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge>Heat {active.heatNumber || "—"}</Badge>
              <Badge variant="outline">Shift {active.shift}</Badge>
              <Badge variant="outline">TTT {active.prediction.predicted_ttt.toFixed(2)} min</Badge>
              <Badge variant="outline">Charge {currentCharge(active.recipe).toFixed(1)} t</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              JSON exports cached session data without extra API calls. PDF/CSV use the backend report generator for the
              current recipe.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
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
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </SectionCard>

          <SectionCard title="Session history" className="mt-4">
            {sessionHistory.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2">Heat</th>
                      <th>Shift</th>
                      <th>Prediction</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionHistory.map((h) => (
                      <tr key={h.id} className="border-b border-border/50">
                        <td className="py-2">{h.heatNumber || "—"}</td>
                        <td>{h.shift}</td>
                        <td className="font-mono">{h.prediction?.predicted_ttt.toFixed(2) ?? "—"} min</td>
                        <td>{h.lastUpdated ? new Date(h.lastUpdated).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">History populates after prediction.</p>
            )}
          </SectionCard>
        </>
      )}
    </PageContainer>
  );
}
