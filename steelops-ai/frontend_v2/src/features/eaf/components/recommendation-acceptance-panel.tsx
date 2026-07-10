"use client";

import { CheckCircle2, Edit3, XCircle } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { INDUSTRIAL_STATUS, acceptanceStatus } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

interface RecommendationAcceptancePanelProps {
  disabled?: boolean;
}

export function RecommendationAcceptancePanel({ disabled }: RecommendationAcceptancePanelProps) {
  const active = useCurrentHeatStore((s) => s.active);
  const setRecommendationAcceptance = useCurrentHeatStore((s) => s.setRecommendationAcceptance);

  if (!active?.optimizer) return null;

  const status = active.recommendationAcceptance;
  const statusKey = acceptanceStatus(status);

  return (
    <SectionCard
      title="Operator Recommendation Review"
      description="Record acceptance status for validation and reports"
    >
      {status ? (
        <div className={cn("mb-4 flex items-center gap-2 rounded-lg border p-3", INDUSTRIAL_STATUS[statusKey].className)}>
          {status === "Accepted" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : status === "Modified" ? (
            <Edit3 className="h-4 w-4" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden />
          )}
          <span className="font-medium">Status: {status}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <AcceptButton
          label="Accept"
          icon={CheckCircle2}
          variant="validated"
          onClick={() => setRecommendationAcceptance("Accepted")}
          disabled={disabled}
        />
        <AcceptButton
          label="Modify"
          icon={Edit3}
          variant="warning"
          onClick={() => setRecommendationAcceptance("Modified")}
          disabled={disabled}
        />
        <AcceptButton
          label="Reject"
          icon={XCircle}
          variant="critical"
          onClick={() => setRecommendationAcceptance("Rejected")}
          disabled={disabled}
        />
      </div>
    </SectionCard>
  );
}

function AcceptButton({
  label,
  icon: Icon,
  variant,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "validated" | "warning" | "critical";
  onClick: () => void;
  disabled?: boolean;
}) {
  const statusKey = variant === "validated" ? "validated" : variant === "warning" ? "warning" : "critical";
  return (
    <Button variant="outline" disabled={disabled} onClick={onClick} className={INDUSTRIAL_STATUS[statusKey].className}>
      <Icon className="mr-2 h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}

export function RecommendationAcceptanceBadge() {
  const status = useCurrentHeatStore((s) => s.active?.recommendationAcceptance);
  if (!status) return null;
  const statusKey = acceptanceStatus(status);
  return (
    <Badge className={INDUSTRIAL_STATUS[statusKey].className}>
      Recommendation: {status}
    </Badge>
  );
}
