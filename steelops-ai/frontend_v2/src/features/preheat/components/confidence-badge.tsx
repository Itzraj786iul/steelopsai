import { Badge } from "@/components/ui/badge";
import { confidenceVariant } from "@/features/preheat/utils/preheat-utils";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  tier: string;
  score?: number;
  className?: string;
}

export function ConfidenceBadge({ tier, score, className }: ConfidenceBadgeProps) {
  return (
    <Badge variant={confidenceVariant(tier)} className={cn("uppercase", className)}>
      {tier}
      {typeof score === "number" ? ` · ${score.toFixed(1)}%` : ""}
    </Badge>
  );
}
