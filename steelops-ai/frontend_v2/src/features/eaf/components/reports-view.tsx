"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { HeatProductionReport } from "@/features/eaf/components/heat-production-report";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
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
      recommendationNotes: active.recommendationNotes,
      modifiedRecipe: active.modifiedRecipe,
      validation: active.validation,
      confidence: active.confidence,
      warnings: active.warnings,
      kpis: {
        charge_t: currentCharge(recipe),
        predicted_ttt: active.prediction?.predicted_ttt ?? null,
        optimized_ttt: active.optimizer?.optimized_ttt ?? null,
        actual_ttt: active.validation?.actualTtt ?? null,
        improvement_min: active.optimizer?.improvement_min ?? null,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jspl_eaf_heat_report_${active.heatNumber || Date.now()}.json`;
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
      description="Production-grade heat report with interactive charts, then daily exports"
    >
      <div className="print:hidden">
        <HeatWorkflowStrip active={active} currentPage="reports" className="mb-6" />
      </div>

      {completed ? (
        <div className={`mb-6 rounded-lg border p-4 print:hidden ${INDUSTRIAL_STATUS.validated.className}`}>
          <div className="flex flex-wrap items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold">
                Heat {completedHeat || "session"} validated — full report below
              </p>
              <p className="text-sm opacity-90">
                Review charts and tables, print/export the package, then start the next heat.
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

      {!active?.prediction && !completed ? <EmptyHeatState className="mb-6 print:hidden" /> : null}

      {active?.prediction ? (
        <>
          <HeatProductionReport
            active={active}
            downloading={downloading}
            onExportJson={() => void handleDownload("json")}
            onExportCsv={() => void handleDownload("csv")}
            onExportPdf={() => void handleDownload("pdf")}
          />
          {error ? <p className="mt-3 text-sm text-destructive print:hidden">{error}</p> : null}
        </>
      ) : null}

      <details className="mt-8 print:hidden rounded-xl border border-border/60 bg-muted/10 p-4">
        <summary className="cursor-pointer text-sm font-medium">Daily production exports (optional)</summary>
        <div className="mt-4 space-y-3">
          {daily ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge>Date {String(daily.date ?? "—")}</Badge>
                <Badge variant="outline">Heats {String(summary.total_heats ?? 0)}</Badge>
                <Badge variant="outline">
                  Avg TTT {summary.average_ttt != null ? Number(summary.average_ttt).toFixed(2) : "—"}
                </Badge>
                <Badge variant="outline">
                  Avg Error {summary.average_error != null ? Number(summary.average_error).toFixed(2) : "—"}
                </Badge>
              </div>
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
                <Button size="sm" variant="ghost" asChild>
                  <Link href="/eaf/heat-history">Open Heat History</Link>
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No daily database report yet.</p>
          )}
        </div>
      </details>

      {sessionHistory.length && active?.prediction ? (
        <details className="mt-4 print:hidden rounded-xl border border-border/60 bg-muted/10 p-4">
          <summary className="cursor-pointer text-sm font-medium">Browser session history</summary>
          <div className="mt-4 overflow-x-auto">
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
        </details>
      ) : null}
    </PageContainer>
  );
}
