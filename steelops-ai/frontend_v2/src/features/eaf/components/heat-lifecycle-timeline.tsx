"use client";

import { CheckCircle2, Circle, CircleDot } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { HEAT_LIFECYCLE_STAGES, lifecycleStageStatus } from "@/lib/heat-lifecycle";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

interface HeatLifecycleTimelineProps {
  active: HeatSessionSnapshot | null;
  compact?: boolean;
}

export function HeatLifecycleTimeline({ active, compact = false }: HeatLifecycleTimelineProps) {
  if (!active) return null;

  const content = (
    <div className={cn("flex flex-col", compact ? "gap-1" : "gap-0")}>
      {HEAT_LIFECYCLE_STAGES.map((stage, index) => {
        const status = lifecycleStageStatus(stage.id, active);
        const isLast = index === HEAT_LIFECYCLE_STAGES.length - 1;

        return (
          <div key={stage.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              {status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />
              ) : status === "current" ? (
                <CircleDot className="h-4 w-4 text-blue-600" aria-label="Current stage" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50" aria-label="Pending" />
              )}
              {!isLast ? <div className="my-0.5 h-full min-h-[1rem] w-px bg-border" /> : null}
            </div>
            <div className={cn("pb-3", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium",
                  status === "completed" && "text-emerald-700 dark:text-emerald-400",
                  status === "current" && "text-blue-700 dark:text-blue-400",
                  status === "pending" && "text-muted-foreground"
                )}
              >
                {stage.label}
              </p>
              {status === "current" && !compact ? (
                <p className="text-xs text-muted-foreground">Current stage</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${INDUSTRIAL_STATUS.prediction.className}`}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide">Heat Lifecycle</p>
        {content}
      </div>
    );
  }

  return (
    <SectionCard title="Heat Lifecycle" description="Workflow progress for the current heat">
      {content}
    </SectionCard>
  );
}
