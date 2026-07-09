"use client";

import { useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafHistorical } from "@/features/eaf/hooks/use-eaf-historical";
import { useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { useEafHistoryStore } from "@/stores/eaf-history-store";
import {
  APP_VERSION,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";
import { assessCharge } from "@/lib/charge-validation";
import { eafApi } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

async function downloadReport(
  recipe: Parameters<typeof eafApi.report>[0],
  format: "json" | "csv" | "pdf",
  meta: Record<string, string>
) {
  if (format === "json") {
    const [{ data: reportData }, { data: predictData }, { data: histData }] = await Promise.all([
      eafApi.report(recipe, "json"),
      eafApi.predict(recipe),
      eafApi.historical(recipe),
    ]);
    const enriched = {
      ...JSON.parse(reportData as string),
      phase_28_metadata: meta,
      confidence: assessCharge(
        recipe.HM + recipe.DRI + recipe.HBI + recipe.Bucket,
        histData.variables
      ),
      prediction_summary: {
        predicted_ttt: predictData.predicted_ttt,
        ci_lower_95: predictData.ci_lower_95,
        ci_upper_95: predictData.ci_upper_95,
        operator_summary: predictData.operator_summary,
      },
      research_notes: {
        research_version: RESEARCH_VERSION,
        electrical_energy_note:
          "POWER field displays as Electrical Energy (kWh) — retrospective variable per Phase 23 research.",
        production_frozen: true,
      },
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jspl_eaf_report_${Date.now()}.json`;
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
  a.download = `jspl_eaf_report_${Date.now()}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatTimestamp(ts: number) {
  return new Date(ts).toLocaleString();
}

export function ReportsView() {
  const { recipe, update, charge } = useEafRecipe();
  const { data: historical } = useEafHistorical(recipe);
  const { entries, clear } = useEafHistoryStore();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predictions = entries.filter((e) => e.type === "prediction");
  const optimizations = entries.filter((e) => e.type === "optimization");
  const chargeAssessment = assessCharge(charge, historical?.variables);

  const meta = {
    model_version: PRODUCTION_MODEL_PHASE,
    frontend_version: APP_VERSION,
    research_version: RESEARCH_VERSION,
    prediction_timestamp: new Date().toISOString(),
    confidence_tier: chargeAssessment.confidence,
  };

  const handleDownload = async (format: "json" | "csv" | "pdf") => {
    setDownloading(format);
    setError(null);
    try {
      await downloadReport(recipe, format, meta);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Report export failed"));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <PageContainer
      title="Reports"
      description="Exportable decision-support reports with confidence, historical comparison, and research notes"
    >
      <RecipeForm recipe={recipe} onChange={update} charge={charge} historicalVariables={historical?.variables} />

      <SectionCard title="Report metadata" className="mt-6">
        <div className="flex flex-wrap gap-2">
          <Badge>Model {PRODUCTION_MODEL_PHASE}</Badge>
          <Badge variant="outline">Frontend v{APP_VERSION}</Badge>
          <Badge variant="outline">Confidence: {chargeAssessment.confidence}</Badge>
          <Badge variant="outline">{RESEARCH_VERSION}</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          JSON exports include Phase 28 enrichment: confidence assessment, historical comparison context, research
          notes, model version, and prediction timestamp. PDF/CSV use the backend report generator (production frozen).
        </p>
      </SectionCard>

      <SectionCard title="Export Reports" description="Download prediction and optimization package for the current recipe" className="mt-4">
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
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Industrial recommendations" className="mt-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Compare burden and Electrical Energy (kWh) inputs against historical P5–P95 before committing a heat plan.</li>
          <li>• Treat energy-driven SHAP attribution as retrospective — not a planning-time control lever.</li>
          <li>• Use optimizer suggestions as guidance; confirm physics compliance and shift constraints.</li>
          <li>• Consult Research Center for experimental model findings — not for live dispatch decisions.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Prediction History" description="Recent tap-to-tap predictions from this session" className="mt-4">
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

      <SectionCard title="Previous Optimizations" description="Recipe optimization runs from this session" className="mt-4">
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
