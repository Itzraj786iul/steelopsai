import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChecklistStatus } from "@/lib/deployment-checklist";

const STYLES: Record<ChecklistStatus, string> = {
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  yellow: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400",
};

const LABELS: Record<ChecklistStatus, string> = {
  green: "Ready",
  yellow: "Review",
  red: "At Risk",
};

export function TrafficLightBadge({ status, className }: { status: ChecklistStatus; className?: string }) {
  return (
    <Badge className={cn(STYLES[status], className)} aria-label={`Status: ${LABELS[status]}`}>
      {LABELS[status]}
    </Badge>
  );
}
