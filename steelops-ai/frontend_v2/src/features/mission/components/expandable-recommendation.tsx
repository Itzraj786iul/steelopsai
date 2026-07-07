"use client";

import { memo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { humanize } from "@/lib/human-language";

export interface RecommendationDetail {
  why: string;
  whatChanges: string;
  howMuch: string;
  risk: string;
  confidence: string;
  approver: string;
  businessValue: string;
  evidence: string;
}

interface ExpandableRecommendationProps {
  title: string;
  confidenceTier: string;
  detail: RecommendationDetail;
  className?: string;
}

export const ExpandableRecommendation = memo(function ExpandableRecommendation({
  title,
  confidenceTier,
  detail,
  className,
}: ExpandableRecommendationProps) {
  const [open, setOpen] = useState(false);

  const rows: Array<{ label: string; value: string }> = [
    { label: "Why?", value: detail.why },
    { label: "What changes?", value: detail.whatChanges },
    { label: "How much?", value: detail.howMuch },
    { label: "Risk?", value: detail.risk },
    { label: humanize("How certain is AI?"), value: detail.confidence },
    { label: "Who approves?", value: detail.approver },
    { label: "Business value", value: detail.businessValue },
    { label: "Historical evidence", value: detail.evidence },
  ];

  return (
    <article className={cn("rounded-2xl border border-border/70 bg-card/60", className)}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 p-5 text-left focus-ring"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <div>
          <p className="text-label">AI recommendation</p>
          <h3 className="mt-1 text-heading-sm">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={confidenceTier === "HIGH" ? "success" : "outline"}>{humanize(confidenceTier)}</Badge>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/50 px-5 py-4">
          {rows.map((row) => (
            <div key={row.label}>
              <p className="text-xs font-medium uppercase text-muted-foreground">{row.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed">{row.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
});
