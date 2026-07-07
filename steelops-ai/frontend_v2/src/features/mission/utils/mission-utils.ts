import type { DashboardHeatRow } from "@/types/preheat.types";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

export interface MissionHeat {
  id: string;
  heatNumber: string;
  title: string;
  subtitle: string;
  priorityScore: number;
  businessValueInr: number;
  confidence: string;
  confidenceScore: number;
  deadline: string | null;
  operatorImpact: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  minutesToSave: number;
  status: string;
  aiReadiness: string;
  sortOrder: number;
}

export interface MissionBriefing {
  objective: string;
  bottlenecks: string[];
  risks: string[];
  opportunities: string[];
  maintenanceWarnings: string[];
  inventoryWarnings: string[];
}

export interface MissionStats {
  totalHeats: number;
  underTargetCount: number;
  attentionCount: number;
  recoverableMinutes: number;
  savingsInr: number;
  pendingApprovals: number;
}

const PRIORITY_WEIGHT = { HIGH: 30, MEDIUM: 18, LOW: 8 } as const;

export function buildMissionHeats(
  rows: DashboardHeatRow[],
  activePackage: PreheatDecisionPackage | null,
  defaultMinutesSave = 0.4
): MissionHeat[] {
  return rows.map((row, index) => {
    const minutesToSave = row.minutesToSave ?? (index === 0 ? activePackage?.minutes_to_save ?? 1.2 : defaultMinutesSave);
    const businessValue = minutesToSave * 500;
    const confidenceScore = row.aiReadiness === "READY" ? 88 : row.aiReadiness === "ANALYZING" ? 72 : 58;
    const priorityScore =
      PRIORITY_WEIGHT[row.priority] +
      (row.aiReadiness === "READY" ? 15 : 0) +
      minutesToSave * 8 +
      (index === 0 ? 20 : 0) -
      index * 2;

    const risk: MissionHeat["risk"] =
      row.priority === "HIGH" && row.aiReadiness !== "READY" ? "HIGH" : row.priority === "HIGH" ? "MEDIUM" : "LOW";

    return {
      id: row.id,
      heatNumber: row.heatNumber,
      title: `Optimize ${row.heatNumber} — save ${minutesToSave.toFixed(1)} min`,
      subtitle: `${row.grade} · ${row.operator}`,
      priorityScore: Math.round(priorityScore),
      businessValueInr: businessValue,
      confidence: confidenceScore >= 80 ? "High" : confidenceScore >= 65 ? "Medium" : "Low",
      confidenceScore,
      deadline: row.plannedStart,
      operatorImpact: index === 0 ? "Charge next — sets shift pace" : "Queue position " + (index + 1),
      risk,
      minutesToSave,
      status: row.status,
      aiReadiness: row.aiReadiness,
      sortOrder: index,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore);
}

export function buildMissionStats(
  rows: DashboardHeatRow[],
  activePackage: PreheatDecisionPackage | null,
  pendingApprovals: number
): MissionStats {
  const totalHeats = rows.length;
  const recoverable = activePackage?.minutes_to_save ?? rows.length * 0.4;
  const savings = activePackage?.business_value_inr ?? recoverable * 500;
  const underTarget = Math.max(0, Math.floor(totalHeats * 0.75));
  const attention = pendingApprovals + rows.filter((r) => r.priority === "HIGH" && r.aiReadiness !== "READY").length;

  return {
    totalHeats,
    underTargetCount: underTarget,
    attentionCount: attention,
    recoverableMinutes: recoverable,
    savingsInr: savings,
    pendingApprovals,
  };
}

export function buildMissionBriefing(stats: MissionStats, rows: DashboardHeatRow[]): MissionBriefing {
  const firstHeat = rows[0]?.heatNumber ?? "next heat";
  return {
    objective: `Finish ${stats.underTargetCount} of ${stats.totalHeats} heats under target — start with ${firstHeat}.`,
    bottlenecks:
      stats.pendingApprovals > 0
        ? [`${stats.pendingApprovals} approval(s) blocking charge`, "Shift handover window tightening"]
        : ["Furnace turnaround between heats", "DRI moisture variability"],
    risks:
      stats.attentionCount > 0
        ? [`${stats.attentionCount} heat(s) need attention before charge`, "Phosphorus drift on high-DRI mixes"]
        : ["Low — AI confidence high across queue"],
    opportunities: [
      `${stats.recoverableMinutes.toFixed(0)} minutes recoverable today`,
      `₹${Math.round(stats.savingsInr).toLocaleString("en-IN")} potential value`,
      "Copilot recipes ready for top-priority heats",
    ],
    maintenanceWarnings: ["EAF electrode inspection due end of shift"],
    inventoryWarnings: ["DRI bin 2 below comfort level — monitor charge"],
  };
}
