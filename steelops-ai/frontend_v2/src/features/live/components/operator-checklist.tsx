"use client";

import { CheckCircle2, Circle } from "lucide-react";

import type { LiveRecommendationItem } from "@/types/live.types";

export function OperatorChecklist({
  recommendations,
  onAccept,
}: {
  recommendations: LiveRecommendationItem[];
  onAccept: (recId: string) => void;
}) {
  return (
    <div className="space-y-2">
      {recommendations.map((rec) => {
        const done = rec.status === "ACCEPTED";
        return (
          <button
            key={rec.id}
            type="button"
            onClick={() => !done && onAccept(rec.id)}
            className="flex w-full items-start gap-3 rounded-lg border border-border/70 bg-muted/15 px-3 py-2 text-left text-sm hover:border-primary/40"
          >
            {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" /> : <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />}
            <span>{rec.action_text}</span>
          </button>
        );
      })}
      {recommendations.length === 0 ? <p className="text-sm text-muted-foreground">Checklist clear.</p> : null}
    </div>
  );
}
