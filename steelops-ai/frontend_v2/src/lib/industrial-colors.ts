/** Industrial HMI color tokens — always pair with icons and labels. */

export const INDUSTRIAL_STATUS = {
  validated: {
    label: "Validated",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  prediction: {
    label: "Prediction",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dotClassName: "bg-blue-500",
  },
  historical: {
    label: "Historical",
    className: "border-border bg-muted/50 text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  },
  warning: {
    label: "Warning",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  critical: {
    label: "Critical",
    className: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
} as const;

export type IndustrialStatusKey = keyof typeof INDUSTRIAL_STATUS;

export function confidenceStatus(confidence: string | null | undefined): IndustrialStatusKey {
  if (!confidence) return "historical";
  const lower = confidence.toLowerCase();
  if (lower.includes("high")) return "validated";
  if (lower.includes("low")) return "warning";
  return "prediction";
}

export function acceptanceStatus(
  status: "Accepted" | "Modified" | "Rejected" | null | undefined
): IndustrialStatusKey {
  if (status === "Accepted") return "validated";
  if (status === "Modified") return "warning";
  if (status === "Rejected") return "critical";
  return "historical";
}
