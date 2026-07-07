import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  PLANNED: "secondary",
  ACTIVE: "default",
  COMPLETE: "success",
  DELAYED: "destructive",
  PAUSED: "warning",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  online: "success",
  offline: "destructive",
  reconnecting: "warning",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const variant =
    STATUS_VARIANTS[status] ??
    STATUS_VARIANTS[status.toUpperCase()] ??
    (normalized.includes("high")
      ? "success"
      : normalized.includes("low")
        ? "destructive"
        : "muted");

  return (
    <Badge variant={variant} className={cn("capitalize", className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
