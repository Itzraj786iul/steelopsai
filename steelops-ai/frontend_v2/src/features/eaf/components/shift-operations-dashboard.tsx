"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  Gauge,
  Target,
  TrendingDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { EafKpiCard } from "@/features/eaf/components/eaf-kpi-card";
import { usePlantContext } from "@/hooks/use-plant-context";
import { eafApi, type HeatDashboardResponse } from "@/lib/api/eaf";
import { deriveCurrentLifecycleStage } from "@/lib/heat-lifecycle";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { industrialEase } from "@/lib/motion";
import {
  buildDailyReportPayload,
  buildFurnaceTimeline,
  chartDataFromToday,
  computeExecutiveKpis,
  computeShiftPerformance,
  computeTodayProduction,
  deriveHeatQueueStatus,
  filterHeatArchive,
  generatePlantAlerts,
  getAllHeats,
  getTodayHeats,
  getTodayOperatorActivity,
  heatSimilarity,
  type HeatQueueStatus,
} from "@/lib/shift-operations";
import { cn } from "@/lib/utils";
import { currentCharge, useCurrentHeatStore } from "@/stores/current-heat-store";
import { SHIFTS } from "@/lib/constants";

const QUEUE_STATUS: Record<HeatQueueStatus, { label: string; className: string }> = {
  predicted: { label: "Predicted", className: INDUSTRIAL_STATUS.prediction.className },
  optimized: { label: "Optimized", className: INDUSTRIAL_STATUS.validated.className },
  waiting_validation: { label: "Waiting Validation", className: INDUSTRIAL_STATUS.warning.className },
  archived: { label: "Archived", className: INDUSTRIAL_STATUS.historical.className },
};

const PIE_COLORS = ["#1B7A3D", "#D97706", "#B83232", "#64748B"];

export function ShiftOperationsDashboard() {
  const active = useCurrentHeatStore((s) => s.active);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);
  const operatorActivity = useCurrentHeatStore((s) => s.operatorActivity);
  const loadHeat = useCurrentHeatStore((s) => s.loadHeat);
  const recordReportExport = useCurrentHeatStore((s) => s.recordReportExport);
  const { shift } = usePlantContext();

  const today = getTodayHeats(active, sessionHistory);
  const production = computeTodayProduction(active, sessionHistory, shift);
  const shiftPerf = computeShiftPerformance(active, sessionHistory, shift);
  const kpis = computeExecutiveKpis(active, sessionHistory);
  const alerts = generatePlantAlerts(active, sessionHistory);
  const timeline = buildFurnaceTimeline(active);
  const charts = chartDataFromToday(today);
  const todayActivity = getTodayOperatorActivity(operatorActivity);
  const currentStage = active ? deriveCurrentLifecycleStage(active) : null;
  const [dbDash, setDbDash] = useState<HeatDashboardResponse | null>(null);

  useEffect(() => {
    eafApi
      .heatsDashboard({ period: "today" })
      .then(({ data }) => setDbDash(data))
      .catch(() => setDbDash(null));
  }, [active?.id, sessionHistory.length]);

  return (
    <div className="space-y-6">
      {/* Section A — Current Active Heat */}
      <SectionCard title="Current Active Heat" description="Operator view — single heat in progress">
        {active?.prediction ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              <MiniStat label="Heat Number" value={active.heatNumber || "—"} />
              <MiniStat label="Shift" value={active.shift} />
              <MiniStat label="Current Charge" value={`${currentCharge(active.recipe).toFixed(1)} t`} mono />
              <MiniStat label="Predicted TTT" value={`${active.prediction.predicted_ttt.toFixed(2)} min`} mono highlight="prediction" />
              <MiniStat label="Confidence" value={active.confidence ?? "—"} />
              <MiniStat label="Similarity" value={heatSimilarity(active) != null ? `${heatSimilarity(active)!.toFixed(0)}%` : "—"} />
              <MiniStat label="Current Stage" value={currentStage?.replace(/_/g, " ") ?? "—"} />
            </div>
          </div>
        ) : (
          <EmptyHeatState variant="inline" />
        )}
      </SectionCard>

      {dbDash?.cards ? (
        <SectionCard
          title="Production Database (Today)"
          description="Permanent HeatRecord statistics — see Shift Dashboard for full analytics"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <MiniStat label="DB Heats" value={String(dbDash.cards.total_heats)} large />
            <MiniStat label="Completed" value={String(dbDash.cards.completed)} />
            <MiniStat label="Pending Validation" value={String(dbDash.cards.pending_validation)} />
            <MiniStat
              label="Avg Predicted TTT"
              value={dbDash.cards.average_ttt != null ? `${dbDash.cards.average_ttt.toFixed(2)} min` : "—"}
              mono
            />
            <MiniStat
              label="Avg Saving"
              value={dbDash.cards.average_saving != null ? `${dbDash.cards.average_saving.toFixed(2)} min` : "—"}
              mono
              highlight="validated"
            />
            <MiniStat
              label="Acceptance"
              value={dbDash.cards.acceptance_rate != null ? `${dbDash.cards.acceptance_rate}%` : "—"}
            />
          </div>
          <div className="mt-3">
            <Button size="sm" variant="outline" asChild>
              <Link href="/eaf/shift-dashboard">Open Shift Dashboard</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild className="ml-2">
              <Link href="/eaf/heat-history">Heat History</Link>
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {/* Section B — Today's Production (sticky summary) */}
      <div className="sticky top-[calc(var(--header-height,3.5rem)+0.25rem)] z-[5]">
        <SectionCard title="Today's Production" description={`Shift ${production.currentShift} — client-side session statistics`}>
          {production.totalHeats === 0 ? (
            <p className="text-sm text-muted-foreground">No production history yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              <MiniStat label="Total Heats" value={String(production.totalHeats)} large />
              <MiniStat label="Running" value={String(production.running)} />
              <MiniStat label="Completed" value={String(production.completed)} />
              <MiniStat label="Optimized" value={String(production.optimized)} />
              <MiniStat label="Validated" value={String(production.validated)} />
              <MiniStat label="Avg Predicted TTT" value={production.avgPredictedTtt != null ? `${production.avgPredictedTtt.toFixed(2)} min` : "—"} mono />
              <MiniStat label="Avg Expected Saving" value={production.avgExpectedSaving != null ? `${production.avgExpectedSaving.toFixed(2)} min` : "—"} mono highlight="validated" />
              <MiniStat label="Avg Confidence" value={production.avgConfidenceLabel} />
              <MiniStat label="Avg Reliability" value={production.avgReliability != null ? `${production.avgReliability.toFixed(1)}` : "—"} mono />
              <MiniStat label="Avg Charge" value={production.avgCharge != null ? `${production.avgCharge.toFixed(1)} t` : "—"} mono />
              <MiniStat label="Avg Electrical Energy" value={production.avgElectricalEnergy != null ? `${(production.avgElectricalEnergy / 1000).toFixed(1)}k kWh` : "—"} mono />
              <MiniStat label="Avg Oxygen" value={production.avgOxygen != null ? production.avgOxygen.toFixed(0) : "—"} mono />
              <MiniStat label="Avg DRI" value={production.avgDri != null ? `${production.avgDri.toFixed(1)} t` : "—"} mono />
              <MiniStat label="Current Shift" value={production.currentShift} />
              <MiniStat label="Best Heat" value={production.bestHeat?.heatNumber || "—"} highlight="validated" />
              <MiniStat label="Worst Heat" value={production.worstHeat?.heatNumber || "—"} />
            </div>
          )}
        </SectionCard>
      </div>

      {/* Executive KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiLink href="/eaf/health" title="Plant Availability" value={fmtPct(kpis.plantAvailability)} icon={Gauge} />
        <KpiLink href="/eaf/validation" title="Prediction Accuracy" value={fmtPct(kpis.predictionAccuracy)} icon={Target} />
        <KpiLink href="/eaf/optimizer" title="Optimizer Acceptance" value={fmtPct(kpis.optimizerAcceptance)} icon={CheckCircle2} />
        <KpiLink href="/eaf/reliability" title="Model Reliability" value={kpis.modelReliability != null ? `${kpis.modelReliability.toFixed(1)}` : "—"} icon={Activity} />
        <KpiLink href="/eaf/optimizer" title="Average Saving" value={kpis.averageSaving != null ? `${kpis.averageSaving.toFixed(2)} min` : "—"} icon={TrendingDown} valueClass="text-emerald-600" />
        <KpiLink href="/eaf/research/digital-twin" title="Digital Twin Readiness" value={kpis.digitalTwinReadiness != null ? `${kpis.digitalTwinReadiness.toFixed(0)}%` : "—"} icon={BarChart3} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Heat Queue */}
        <SectionCard title="Heat Queue" description="All heats processed today — select to load into Current Heat">
          {today.length === 0 ? (
            <p className="text-sm text-muted-foreground">No heats in queue today.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Heat</th>
                    <th className="pr-2">Shift</th>
                    <th className="pr-2">Status</th>
                    <th className="pr-2">Prediction</th>
                    <th className="pr-2">Optimizer</th>
                    <th className="pr-2">Reliability</th>
                    <th className="pr-2">Time</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {today.map((h) => {
                    const status = deriveHeatQueueStatus(h, h.id === active?.id);
                    const st = QUEUE_STATUS[status];
                    return (
                      <tr key={h.id} className="border-b border-border/40">
                        <td className="py-2 pr-2 font-medium">{h.heatNumber || "—"}</td>
                        <td className="pr-2">{h.shift}</td>
                        <td className="pr-2"><Badge className={cn("text-[10px]", st.className)}>{st.label}</Badge></td>
                        <td className="pr-2 font-mono">{h.prediction?.predicted_ttt.toFixed(1) ?? "—"}</td>
                        <td className="pr-2 font-mono">{h.optimizer ? `−${h.optimizer.improvement_min.toFixed(1)}` : "—"}</td>
                        <td className="pr-2 font-mono">{h.hybrid?.reliability_index.toFixed(0) ?? "—"}</td>
                        <td className="pr-2 text-muted-foreground">{h.lastUpdated ? new Date(h.lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td>
                          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => loadHeat(h.id)} disabled={h.id === active?.id}>
                            Load
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Shift Performance */}
        <SectionCard title={`Shift Performance — ${shiftPerf.shift}`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat label="Total Heats" value={String(shiftPerf.totalHeats)} />
            <MiniStat label="Average TTT" value={shiftPerf.avgTtt != null ? `${shiftPerf.avgTtt.toFixed(2)} min` : "—"} mono />
            <MiniStat label="Average Saving" value={shiftPerf.avgSaving != null ? `${shiftPerf.avgSaving.toFixed(2)} min` : "—"} mono />
            <MiniStat label="Average Confidence" value={shiftPerf.avgConfidenceLabel} />
            <MiniStat label="Average Reliability" value={shiftPerf.avgReliability != null ? shiftPerf.avgReliability.toFixed(1) : "—"} mono />
            <MiniStat label="Accepted" value={String(shiftPerf.acceptedRecommendations)} highlight="validated" />
            <MiniStat label="Rejected" value={String(shiftPerf.rejectedRecommendations)} />
            <MiniStat label="Session MAE" value={shiftPerf.sessionMae != null ? `${shiftPerf.sessionMae.toFixed(2)} min` : "—"} mono />
          </div>
        </SectionCard>
      </div>

      {/* Furnace Timeline */}
      {active?.prediction ? (
        <SectionCard title="Furnace Timeline" description="Current heat lifecycle with timestamps">
          <div className="space-y-0">
            {timeline.map((ev, i) => (
              <motion.div
                key={`${ev.label}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...industrialEase, delay: i * 0.04 }}
                className="flex items-start gap-4 border-l-2 border-border py-2 pl-4 ml-2"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">{ev.time}</span>
                <div className="flex flex-1 items-center gap-2">
                  {ev.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />
                  ) : ev.status === "current" ? (
                    <Activity className="h-4 w-4 text-blue-600" aria-label="In progress" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-muted-foreground/40" aria-label="Pending" />
                  )}
                  <span className={cn("text-sm", ev.status === "completed" && "text-emerald-700 dark:text-emerald-400", ev.status === "current" && "font-semibold text-blue-700 dark:text-blue-400", ev.status === "pending" && "text-muted-foreground")}>
                    {ev.label}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {/* Plant Alerts + Operator Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Plant Alerts">
          {!alerts.length ? (
            <p className="text-sm text-muted-foreground">No active alerts.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 text-sm",
                    a.severity === "critical" ? INDUSTRIAL_STATUS.critical.className : a.severity === "warning" ? INDUSTRIAL_STATUS.warning.className : INDUSTRIAL_STATUS.prediction.className
                  )}
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs opacity-90">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Today's Operator Activity">
          {!todayActivity.length ? (
            <p className="text-sm text-muted-foreground">No activity recorded today.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {todayActivity.slice(0, 20).map((a) => (
                <div key={a.id} className="flex justify-between border-b border-border/40 py-1.5 text-xs">
                  <span className="capitalize">{a.action}</span>
                  <span className="text-muted-foreground">Heat {a.heatNumber || "—"} · {new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Daily Analytics */}
      {today.length > 0 ? (
        <SectionCard title="Daily Analytics" description="Shift trends from session history">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartBlock title="Average TTT Trend" empty={!charts.tttTrend.length}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={charts.tttTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="ttt" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="Average Saving Trend" empty={!charts.savingTrend.length}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={charts.savingTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="saving" stroke="#1B7A3D" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="Confidence Distribution" empty={!charts.confidenceDist.some((c) => c.count > 0)}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={charts.confidenceDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="Charge Distribution" empty={!charts.chargeDist.length}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={charts.chargeDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="charge" fill="#64748b" />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="Heat Duration Histogram" empty={!charts.durationHist.length}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={charts.durationHist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="duration" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="duration" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </ChartBlock>
            <ChartBlock title="Recommendation Acceptance" empty={!charts.acceptance.some((a) => a.value > 0)}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={charts.acceptance.filter((a) => a.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                    {charts.acceptance.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartBlock>
          </div>
        </SectionCard>
      ) : null}

      {/* Heat Archive */}
      <HeatArchivePanel heats={getAllHeats(active, sessionHistory)} onLoad={loadHeat} />

      {/* Production Report Export */}
      <SectionCard title="Daily Production Report" description="Export shift summary — JSON, CSV, or printable PDF">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { exportDailyReport("json", active, sessionHistory, shift); recordReportExport(); }}>
            <Download className="mr-2 h-4 w-4" />JSON
          </Button>
          <Button size="sm" variant="outline" onClick={() => { exportDailyReport("csv", active, sessionHistory, shift); recordReportExport(); }}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => { exportDailyReport("pdf", active, sessionHistory, shift); recordReportExport(); }}>
            <Download className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

function HeatArchivePanel({
  heats,
  onLoad,
}: {
  heats: ReturnType<typeof getAllHeats>;
  onLoad: (id: string) => void;
}) {
  const [filters, setFilters] = useState({
    heatNumber: "",
    shift: "all",
    date: "",
    confidence: "all",
    validationStatus: "all",
    operatorDecision: "all",
  });

  const filtered = filterHeatArchive(heats, filters);

  return (
    <SectionCard title="Heat Archive" description="Search and load historical heats into Current Heat">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div><Label className="text-xs">Heat Number</Label><Input className="mt-1 h-8" value={filters.heatNumber} onChange={(e) => setFilters((f) => ({ ...f, heatNumber: e.target.value }))} placeholder="Search" /></div>
        <div>
          <Label className="text-xs">Shift</Label>
          <Select value={filters.shift} onValueChange={(v) => setFilters((f) => ({ ...f, shift: v }))}>
            <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {SHIFTS.map((s) => <SelectItem key={s} value={s}>Shift {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">Date</Label><Input className="mt-1 h-8" type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} /></div>
        <div>
          <Label className="text-xs">Confidence</Label>
          <Select value={filters.confidence} onValueChange={(v) => setFilters((f) => ({ ...f, confidence: v }))}>
            <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Validation</Label>
          <Select value={filters.validationStatus} onValueChange={(v) => setFilters((f) => ({ ...f, validationStatus: v }))}>
            <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="validated">Validated</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Operator Decision</Label>
          <Select value={filters.operatorDecision} onValueChange={(v) => setFilters((f) => ({ ...f, operatorDecision: v }))}>
            <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Modified">Modified</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">No heats match filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">Heat</th>
                <th>Shift</th>
                <th>TTT</th>
                <th>Confidence</th>
                <th>Decision</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map((h) => (
                <tr key={h.id} className="border-b border-border/40">
                  <td className="py-2 font-medium">{h.heatNumber || "—"}</td>
                  <td>{h.shift}</td>
                  <td className="font-mono">{h.prediction?.predicted_ttt.toFixed(1) ?? "—"}</td>
                  <td>{h.confidence ?? "—"}</td>
                  <td>{h.recommendationAcceptance ?? "—"}</td>
                  <td className="text-muted-foreground">{h.lastUpdated?.slice(0, 10) ?? "—"}</td>
                  <td><Button variant="ghost" size="sm" className="h-7" onClick={() => onLoad(h.id)}>Load</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function MiniStat({
  label,
  value,
  mono,
  highlight,
  large,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: "validated" | "prediction";
  large?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(large ? "text-2xl" : "text-base", "font-semibold", mono && "font-mono", highlight === "validated" && "text-emerald-700 dark:text-emerald-400", highlight === "prediction" && "text-blue-700 dark:text-blue-400")}>
        {value}
      </p>
    </div>
  );
}

function KpiLink({
  href,
  title,
  value,
  icon: Icon,
  valueClass,
}: {
  href: string;
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClass?: string;
}) {
  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      <EafKpiCard
        title={title}
        value={value}
        valueClassName={valueClass}
        className="h-full cursor-pointer border-primary/10 hover:border-primary/30"
      />
      <Icon className="sr-only" aria-hidden />
    </Link>
  );
}

function ChartBlock({ title, children, empty }: { title: string; children: React.ReactNode; empty?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</p>
      {empty ? <p className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">Insufficient data</p> : children}
    </div>
  );
}

function fmtPct(v: number | null): string {
  return v != null ? `${v.toFixed(0)}%` : "—";
}

function exportDailyReport(
  format: "json" | "csv" | "pdf",
  active: ReturnType<typeof useCurrentHeatStore.getState>["active"],
  sessionHistory: ReturnType<typeof useCurrentHeatStore.getState>["sessionHistory"],
  shift: string
) {
  const payload = buildDailyReportPayload(active, sessionHistory, shift);
  const date = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    downloadBlob(JSON.stringify(payload, null, 2), `jspl_daily_production_${date}.json`, "application/json");
    return;
  }

  if (format === "csv") {
    const headers = ["heat_number", "shift", "predicted_ttt", "optimized_saving", "confidence", "reliability", "acceptance", "validated", "actual_ttt", "charge"];
    const rows = payload.heats.map((h) =>
      headers.map((k) => String((h as Record<string, unknown>)[k] ?? "")).join(",")
    );
    downloadBlob([headers.join(","), ...rows].join("\n"), `jspl_daily_production_${date}.csv`, "text/csv");
    return;
  }

  const html = `<!DOCTYPE html><html><head><title>Daily Production Report ${date}</title>
<style>body{font-family:system-ui;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{font-size:18px}</style></head>
<body><h1>JSPL EAF Daily Production Report</h1>
<p>Shift ${shift} · Generated ${payload.generated_at}</p>
<h2>Summary</h2><ul>
<li>Total Heats: ${payload.production.totalHeats}</li>
<li>Avg TTT: ${payload.production.avgPredictedTtt?.toFixed(2) ?? "—"} min</li>
<li>Avg Saving: ${payload.production.avgExpectedSaving?.toFixed(2) ?? "—"} min</li>
<li>Session MAE: ${payload.session_mae?.toFixed(2) ?? "—"} min</li>
<li>Accepted: ${payload.shift_performance.acceptedRecommendations}</li>
<li>Rejected: ${payload.shift_performance.rejectedRecommendations}</li>
</ul>
<h2>Heats</h2><table><tr>${["Heat", "Shift", "TTT", "Saving", "Confidence", "Acceptance"].map((h) => `<th>${h}</th>`).join("")}</tr>
${payload.heats.map((h) => `<tr><td>${h.heat_number}</td><td>${h.shift}</td><td>${h.predicted_ttt ?? "—"}</td><td>${h.optimized_saving ?? "—"}</td><td>${h.confidence ?? "—"}</td><td>${h.acceptance ?? "—"}</td></tr>`).join("")}
</table></body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
