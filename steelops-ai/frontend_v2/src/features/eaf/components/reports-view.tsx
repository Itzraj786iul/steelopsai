"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { RecommendationAcceptanceBadge } from "@/features/eaf/components/recommendation-acceptance-panel";
import {
  APP_VERSION,
  PRODUCTION_MODEL_PHASE,
} from "@/lib/constants";
import { currentCharge, useCurrentHeatStore } from "@/stores/current-heat-store";
import { eafApi } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";

async function downloadFromSession(
  format: "json" | "csv" | "pdf",
  active: NonNullable<ReturnType<typeof useCurrentHeatStore.getState>["active"]>
) {
  const recipe = active.recipe;
  const meta = {
    model_version: PRODUCTION_MODEL_PHASE,
    frontend_version: APP_VERSION,
    heat_number: active.heatNumber,
    shift: active.shift,
    generated_at: new Date().toISOString(),
    last_updated: active.lastUpdated,
  };

  if (format === "json") {
    const payload = {
      heat_report: meta,
      recipe,
      prediction: active.prediction,
      hybrid: active.hybrid,
      optimizer: active.optimizer,
      recommendationAcceptance: active.recommendationAcceptance,
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
  const recordReportExport = useCurrentHeatStore((s) => s.recordReportExport);
  const searchParams = useSearchParams();
  const completed = searchParams.get("completed") === "1";
  const completedHeat = searchParams.get("heat") || active?.heatNumber || "";
  const recordId = searchParams.get("recordId");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    eafApi
      .heatsDailyReport()
      .then(({ data }) => setDaily(data as Record<string, unknown>))
      .catch(() => setDaily(null));
  }, []);

  const handleDownload = async (format: "json" | "csv" | "pdf") => {
    if (!active?.prediction) return;
    setDownloading(format);
    setError(null);
    try {
      await downloadFromSession(format, active);
      recordReportExport();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Report export failed"));
    } finally {
      setDownloading(null);
    }
  };

  const exportDb = async (format: "csv" | "json" | "excel" | "pdf") => {
    setDownloading(`db-${format}`);
    try {
      const { data } = await eafApi.heatsExport({ format, period: "today" });
      const blob =
        format === "json"
          ? new Blob([typeof data === "string" ? data : JSON.stringify(data)], { type: "application/json" })
          : (data as Blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `daily_production.${format === "excel" ? "xlsx" : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Database export failed"));
    } finally {
      setDownloading(null);
    }
  };

  const summary = (daily?.production_summary || {}) as Record<string, number | string | null>;

  return (
    <PageContainer
      title="Reports"
      description="Current heat exports and production database reports"
    >
      <HeatWorkflowStrip active={active} currentPage="reports" className="mb-6" />

      {completed ? (
        <div className={`mb-6 rounded-lg border p-4 ${INDUSTRIAL_STATUS.validated.className}`}>
          <div className="flex flex-wrap items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold">
                Heat {completedHeat || "session"} validated and saved permanently
              </p>
              <p className="text-sm opacity-90">
                This record is in Heat History. Export below, or start the next heat when ready.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm">
                  <Link
                    href={
                      recordId
                        ? `/eaf/heat-history?highlight=${encodeURIComponent(recordId)}`
                        : completedHeat
                          ? `/eaf/heat-history?q=${encodeURIComponent(completedHeat)}`
                          : "/eaf/heat-history"
                    }
                  >
                    Open in Heat History
                  </Link>
                </Button>
                <NewHeatButton variant="default" size="sm" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {!active?.prediction && !completed ? <EmptyHeatState className="mb-6" /> : null}

      <SectionCard title="Daily production report (database)" className="mt-2">
        {daily ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge>Date {String(daily.date ?? "—")}</Badge>
              <Badge variant="outline">Heats {String(summary.total_heats ?? 0)}</Badge>
              <Badge variant="outline">Avg TTT {summary.average_ttt != null ? Number(summary.average_ttt).toFixed(2) : "—"}</Badge>
              <Badge variant="outline">Avg Error {summary.average_error != null ? Number(summary.average_error).toFixed(2) : "—"}</Badge>
              <Badge variant="outline">Avg Saving {summary.average_saving != null ? Number(summary.average_saving).toFixed(2) : "—"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Generated from permanent HeatRecord rows — not the browser session.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void exportDb("csv")} disabled={!!downloading}>
                Export today CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportDb("excel")} disabled={!!downloading}>
                Export today Excel
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportDb("json")} disabled={!!downloading}>
                Export today JSON
              </Button>
              <Button size="sm" variant="outline" onClick={() => void exportDb("pdf")} disabled={!!downloading}>
                Export today PDF
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/eaf/heat-history">Open Heat History</Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No database report available yet. Run a prediction to create records.</p>
        )}
      </SectionCard>

      {active?.prediction ? (
        <>
          <div className="mb-4 mt-6 flex flex-wrap gap-2">
            <RecommendationAcceptanceBadge />
          </div>
          <SectionCard title="Current heat export">
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
      ) : null}
    </PageContainer>
  );
}
