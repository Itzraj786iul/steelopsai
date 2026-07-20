/** Industrial HMI color tokens — always pair with icons and labels. Prefer CSS vars. */

export const INDUSTRIAL_STATUS = {
  validated: {
    label: "Validated",
    className:
      "border-success/40 bg-success/10 text-success dark:border-success/40 dark:bg-success/10 dark:text-success",
    dotClassName: "bg-success",
  },
  prediction: {
    label: "Prediction",
    className:
      "border-prediction/40 bg-prediction/10 text-prediction dark:border-prediction/40 dark:bg-prediction/10 dark:text-prediction",
    dotClassName: "bg-prediction",
  },
  historical: {
    label: "Historical",
    className: "border-border bg-muted/50 text-muted-foreground",
    dotClassName: "bg-muted-foreground",
  },
  warning: {
    label: "Warning",
    className:
      "border-warning/40 bg-warning/10 text-warning dark:border-warning/40 dark:bg-warning/10 dark:text-warning",
    dotClassName: "bg-warning",
  },
  critical: {
    label: "Critical",
    className:
      "border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/10 dark:text-destructive",
    dotClassName: "bg-destructive",
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
