"use client";

import { Badge } from "@/components/ui/badge";

const QUALITY_STYLE: Record<string, string> = {
  Excellent: "bg-green-600/15 text-green-700 dark:text-green-300",
  Good: "bg-primary/10 text-primary",
  Acceptable: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  Experimental: "bg-orange-500/15 text-orange-800 dark:text-orange-200",
};

export function PredictionQualityBadge({ quality }: { quality?: string }) {
  if (!quality) return null;
  return (
    <Badge className={QUALITY_STYLE[quality] ?? ""} variant="outline">
      Prediction quality: {quality}
    </Badge>
  );
}

export function ConfidenceBadge({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="text-sm">
      <span className="text-label">{label}: </span>
      <Badge variant="outline">{value}</Badge>
    </div>
  );
}
