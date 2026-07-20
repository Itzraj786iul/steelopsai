"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Download,
  FileJson,
  Printer,
  Target,
} from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecommendationAcceptanceBadge } from "@/features/eaf/components/recommendation-acceptance-panel";
import { APP_VERSION, PRODUCTION_MODEL_PHASE } from "@/lib/constants";
import { RECIPE_FIELD_LABELS, formatVariableLabel } from "@/lib/eaf-labels";
import { INDUSTRIAL_STATUS, acceptanceStatus } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import {
  currentCharge,
  type HeatSessionSnapshot,
} from "@/stores/current-heat-store";

const BURDEN_KEYS = ["HM", "DRI", "HBI", "Bucket"] as const;
const RECIPE_KEYS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY"] as const;
const PIE_COLORS = ["#0284c7", "#d97706", "#7c3aed", "#78716c"];

const CHART_TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
};

interface HeatProductionReportProps {
  active: HeatSessionSnapshot;
  onExportJson?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  downloading?: string | null;
  className?: string;
}

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function parseActualTtt(value?: string): number | null {
  if (!value || value === "Pending") return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function HeatProductionReport({
  active,
  onExportJson,
  onExportCsv,
  onExportPdf,
  downloading,
  className,
}: HeatProductionReportProps) {
  const prediction = active.prediction;
  const optimizer = active.optimizer;
  const explain = prediction?.explainability;
  const optExplain = optimizer?.explainability;
  const recipe = active.recipe;
  const optimizedRecipe = active.modifiedRecipe ?? optimizer?.optimized_recipe ?? null;
  const charge = currentCharge(recipe);
  const actualTtt = parseActualTtt(active.validation?.actualTtt);
  const predicted = prediction?.predicted_ttt ?? null;
  const optimized = optimizer?.optimized_ttt ?? null;
  const histBest = useMemo(() => {
    const heats = explain?.similar_heats ?? optExplain?.similar_heats ?? [];
    if (!heats.length) return null;
    return [...heats].sort(
      (a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.similarity_pct - a.similarity_pct
    )[0];
  }, [explain?.similar_heats, optExplain?.similar_heats]);

  const errorMin =
    actualTtt != null && predicted != null ? actualTtt - predicted : null;
  const savingMin =
    predicted != null && optimized != null ? predicted - optimized : optimizer?.improvement_min ?? null;

  const tttChartData = useMemo(() => {
    return [
      { name: "Historical", value: histBest?.actual_ttt ?? null, fill: "#059669" },
      { name: "Predicted", value: predicted, fill: "#2563eb" },
      { name: "Optimized", value: optimized, fill: "#7c3aed" },
      { name: "Actual", value: actualTtt, fill: "#ea580c" },
    ].filter((d) => d.value != null && Number.isFinite(d.value)) as { name: string; value: number; fill: string }[];
  }, [actualTtt, histBest?.actual_ttt, optimized, predicted]);

  const burdenPieData = useMemo(() => {
    return BURDEN_KEYS.map((key) => ({
      name: key,
      value: Math.max(0, recipe[key] ?? 0),
    })).filter((d) => d.value > 0.01);
  }, [recipe]);

  const burdenCompareData = useMemo(() => {
    if (!optimizedRecipe) {
      return BURDEN_KEYS.map((key) => ({
        name: key,
        Current: recipe[key] ?? 0,
      }));
    }
    return BURDEN_KEYS.map((key) => ({
      name: key,
      Current: recipe[key] ?? 0,
      Recommended: optimizedRecipe[key] ?? 0,
    }));
  }, [optimizedRecipe, recipe]);

  const deltaChartData = useMemo(() => {
    const rows = optExplain?.validated_recommendations ?? optimizer?.comparison ?? [];
    return rows
      .filter((r) => Math.abs(r.difference ?? 0) > 0.01)
      .slice(0, 8)
      .map((r) => ({
        name: formatVariableLabel(r.display_name || r.variable),
        delta: r.difference,
        fill: (r.difference ?? 0) >= 0 ? "#d97706" : "#059669",
      }));
  }, [optExplain?.validated_recommendations, optimizer?.comparison]);

  const similarChartData = useMemo(() => {
    const heats = explain?.similar_heats ?? optExplain?.similar_heats ?? [];
    return [...heats]
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .slice(0, 5)
      .map((h) => ({
        name: String(h.heat_id).slice(-6),
        similarity: h.similarity_pct,
        actual: h.actual_ttt ?? null,
        predicted: h.predicted_ttt,
      }));
  }, [explain?.similar_heats, optExplain?.similar_heats]);

  const contributorData = useMemo(() => {
    const rows = prediction?.top_contributors ?? [];
    return rows.slice(0, 6).map((c) => ({
      name: formatVariableLabel(c.display_name || c.feature),
      contribution: c.contribution,
      fill: c.contribution >= 0 ? "#ea580c" : "#2563eb",
    }));
  }, [prediction?.top_contributors]);

  const generatedAt = new Date().toLocaleString();
  const decisionKey = acceptanceStatus(active.recommendationAcceptance);

  const handlePrint = () => {
    window.print();
  };

  if (!prediction) return null;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Production heat report</p>
          <h2 className="text-xl font-semibold tracking-tight">Heat {active.heatNumber || "—"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print / PDF
          </Button>
          {onExportJson ? (
            <Button size="sm" variant="outline" onClick={onExportJson} disabled={!!downloading}>
              <FileJson className="mr-2 h-4 w-4" />
              {downloading === "json" ? "…" : "JSON"}
            </Button>
          ) : null}
          {onExportCsv ? (
            <Button size="sm" variant="outline" onClick={onExportCsv} disabled={!!downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading === "csv" ? "…" : "CSV"}
            </Button>
          ) : null}
          {onExportPdf ? (
            <Button size="sm" variant="outline" onClick={onExportPdf} disabled={!!downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading === "pdf" ? "…" : "API PDF"}
            </Button>
          ) : null}
        </div>
      </div>

      <div id="heat-production-report" className="heat-print-root space-y-6">
        {/* Cover */}
        <SectionCard
          title="JSPL EAF Tap-to-Tap Heat Report"
          description={`${PRODUCTION_MODEL_PHASE} · App ${APP_VERSION} · Generated ${generatedAt}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Heat {active.heatNumber || "—"}</Badge>
            <Badge variant="outline">Shift {active.shift || recipe.Shift}</Badge>
            <Badge variant="outline">Charge {charge.toFixed(1)} t</Badge>
            <RecommendationAcceptanceBadge />
            {active.validation?.validatedAt ? (
              <Badge className={INDUSTRIAL_STATUS.validated.className}>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Validated
              </Badge>
            ) : null}
            {optimizer?.physics_compliant ? (
              <Badge variant="outline">Physics compliant</Badge>
            ) : optimizer ? (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700">
                Physics review
              </Badge>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Predicted cycle" value={`${fmt(predicted)} min`} tone="prediction" />
            <Kpi label="Optimized cycle" value={optimized != null ? `${fmt(optimized)} min` : "—"} tone="info" />
            <Kpi label="Actual cycle" value={actualTtt != null ? `${fmt(actualTtt)} min` : "Pending"} tone="warning" />
            <Kpi
              label={errorMin != null ? "Prediction error" : "Expected saving"}
              value={
                errorMin != null
                  ? `${errorMin >= 0 ? "+" : ""}${fmt(errorMin)} min`
                  : savingMin != null
                    ? `${fmt(savingMin)} min`
                    : "—"
              }
              tone={errorMin != null ? (Math.abs(errorMin) <= 3 ? "validated" : "critical") : "validated"}
            />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Confidence: <span className="font-medium text-foreground">{active.confidence || prediction.confidence || "—"}</span>
            {prediction.ci_lower_95 != null && prediction.ci_upper_95 != null ? (
              <>
                {" "}
                · 95% CI [{fmt(prediction.ci_lower_95)} – {fmt(prediction.ci_upper_95)}] min
              </>
            ) : null}
            {active.lastUpdated ? <> · Session updated {new Date(active.lastUpdated).toLocaleString()}</> : null}
          </p>
        </SectionCard>

        {/* TTT chart */}
        <SectionCard title="Cycle time performance" description="Predicted vs optimized vs actual — hover for exact minutes">
          {tttChartData.length ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tttChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    label={{ value: "min", angle: -90, position: "insideLeft", style: { fontSize: 11 } }}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [`${Number(value).toFixed(2)} min`, "Cycle time"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={64}>
                    {tttChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No cycle-time values available yet.</p>
          )}
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Burden pie */}
          <SectionCard title="Charge mix (current)" description="Share of metallic burden">
            {burdenPieData.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={burdenPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={88}
                      paddingAngle={2}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {burdenPieData.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value) => [`${Number(value).toFixed(1)} t`, "Mass"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No burden data.</p>
            )}
          </SectionCard>

          {/* Current vs recommended */}
          <SectionCard
            title="Current vs recommended burden"
            description={optimizedRecipe ? "Side-by-side planning masses" : "Current recipe only"}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={burdenCompareData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${Number(v).toFixed(1)} t`, ""]} />
                  <Legend />
                  <Bar dataKey="Current" fill="#0284c7" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  {optimizedRecipe ? (
                    <Bar dataKey="Recommended" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  ) : null}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Optimizer deltas */}
        {deltaChartData.length ? (
          <SectionCard title="Optimizer changes" description="Signed deltas vs current recipe">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deltaChartData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [`${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}`, "Change"]}
                  />
                  <Bar dataKey="delta" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {deltaChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Similar heats */}
          {similarChartData.length ? (
            <SectionCard title="Similar historical heats" description="Top neighbours by recipe similarity">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={similarChartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(value, name) => {
                        if (name === "similarity") return [`${Number(value).toFixed(0)}%`, "Similarity"];
                        return [`${Number(value).toFixed(2)} min`, String(name)];
                      }}
                    />
                    <Legend />
                    <Bar dataKey="similarity" name="Similarity %" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-1.5">Heat</th>
                      <th>Sim %</th>
                      <th>Actual</th>
                      <th>Pred</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(explain?.similar_heats ?? optExplain?.similar_heats ?? [])
                      .slice(0, 5)
                      .map((h) => (
                        <tr key={h.heat_id} className="border-t border-border/50">
                          <td className="py-1.5 font-mono">{h.heat_id}</td>
                          <td>{h.similarity_pct.toFixed(0)}%</td>
                          <td className="font-mono">{fmt(h.actual_ttt)} min</td>
                          <td className="font-mono">{fmt(h.predicted_ttt)} min</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          ) : (
            <SectionCard title="Similar historical heats">
              <p className="text-sm text-muted-foreground">No neighbour heats in this session.</p>
            </SectionCard>
          )}

          {/* Contributors */}
          <SectionCard title="Prediction drivers" description="Top model contributors for this heat">
            {contributorData.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contributorData} layout="vertical" margin={{ top: 8, right: 12, left: 16, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Bar dataKey="contribution" radius={[0, 4, 4, 0]} maxBarSize={20}>
                      {contributorData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Contributor detail not available for this prediction.</p>
            )}
          </SectionCard>
        </div>

        {/* Recipe table */}
        <SectionCard title="Recipe detail" description="Planning inputs used for this heat">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Variable</th>
                  <th className="px-3 py-2">Current</th>
                  <th className="px-3 py-2">Recommended</th>
                  <th className="px-3 py-2">Delta</th>
                </tr>
              </thead>
              <tbody>
                {RECIPE_KEYS.map((key) => {
                  const cur = recipe[key] ?? 0;
                  const rec = optimizedRecipe?.[key];
                  const delta = rec != null ? rec - cur : null;
                  const digits = key === "OXY" || key === "CPC" ? 0 : 1;
                  return (
                    <tr key={key} className="border-t border-border/50">
                      <td className="px-3 py-2 text-muted-foreground">{RECIPE_FIELD_LABELS[key] ?? key}</td>
                      <td className="px-3 py-2 font-mono">{fmt(cur, digits)}</td>
                      <td className="px-3 py-2 font-mono">{rec != null ? fmt(rec, digits) : "—"}</td>
                      <td
                        className={cn(
                          "px-3 py-2 font-mono",
                          delta != null && Math.abs(delta) > 0.01
                            ? delta > 0
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-emerald-700 dark:text-emerald-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {delta != null && Math.abs(delta) > 0.01
                          ? `${delta > 0 ? "+" : ""}${fmt(delta, digits)}`
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Decision + validation */}
        <SectionCard title="Operator decision & validation" description="Locked floor decision and production actuals">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={cn("rounded-lg border p-4", INDUSTRIAL_STATUS[decisionKey].className)}>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Decision</p>
              <p className="mt-1 text-lg font-semibold">{active.recommendationAcceptance || "Not locked"}</p>
              {active.recommendationNotes ? (
                <p className="mt-2 text-sm opacity-90">{active.recommendationNotes}</p>
              ) : (
                <p className="mt-2 text-sm opacity-70">No operator notes.</p>
              )}
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Validation</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <Row label="Actual cycle" value={actualTtt != null ? `${fmt(actualTtt)} min` : "Pending"} />
                <Row label="Predicted cycle" value={`${fmt(predicted)} min`} />
                <Row label="Error" value={errorMin != null ? `${errorMin >= 0 ? "+" : ""}${fmt(errorMin)} min` : "—"} />
                <Row label="Optimizer" value={active.validation?.optimizerUsed || (optimizer ? "Production optimizer" : "—")} />
                <Row
                  label="Validated at"
                  value={
                    active.validation?.validatedAt
                      ? new Date(active.validation.validatedAt).toLocaleString()
                      : "—"
                  }
                />
              </dl>
              {active.validation?.operatorComments ? (
                <p className="mt-3 text-sm text-muted-foreground">{active.validation.operatorComments}</p>
              ) : null}
            </div>
          </div>
        </SectionCard>

        {/* Narrative */}
        {(optExplain?.recommendation_narrative?.length || active.warnings?.length) ? (
          <SectionCard title="Notes & observations">
            {optExplain?.recommendation_narrative?.length ? (
              <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {optExplain.recommendation_narrative.slice(0, 6).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
            {active.warnings?.length ? (
              <div className="space-y-1">
                {active.warnings.map((w) => (
                  <p key={w} className="text-sm text-amber-700 dark:text-amber-400">
                    <Target className="mr-1 inline h-3.5 w-3.5" />
                    {w}
                  </p>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        <p className="text-center text-xs text-muted-foreground print:mt-8">
          Confidential — JSPL EAF Industrial AI · Heat {active.heatNumber || "session"} · {generatedAt}
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "validated" | "warning" | "critical" | "prediction" | "info";
}) {
  const toneClass =
    tone === "info"
      ? "border-violet-500/30 bg-violet-500/5 text-violet-800 dark:text-violet-300"
      : INDUSTRIAL_STATUS[tone].className;
  return (
    <div className={cn("rounded-lg border p-3", toneClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}
