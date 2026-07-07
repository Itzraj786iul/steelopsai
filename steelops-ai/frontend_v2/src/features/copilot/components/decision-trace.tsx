"use client";

import { CheckCircle2 } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { TIMELINE_STEPS, timelineProgress } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";
import { cn } from "@/lib/utils";

export function WorkspaceTimeline({ pkg }: { pkg: PreheatDecisionPackage }) {
  const activeStep = timelineProgress(pkg);

  return (
    <SectionCard
      title="Decision progress"
      description="From planned recipe through validation to execution readiness"
      animate={false}
      contentClassName="pt-2"
    >
      <div className="overflow-x-auto scrollbar-thin">
        <ol className="flex min-w-[720px] items-center gap-0 py-1">
          {TIMELINE_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const complete = stepNumber < activeStep;
            const current = stepNumber === activeStep;

            return (
              <li key={step.id} className="flex flex-1 items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                      complete && "border-primary bg-primary/20 text-primary",
                      current && "border-primary bg-primary text-primary-foreground",
                      !complete && !current && "border-border bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {complete ? <CheckCircle2 className="h-4 w-4" /> : stepNumber}
                  </div>
                  <p
                    className={cn(
                      "truncate text-xs font-medium",
                      current ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </div>
                {index < TIMELINE_STEPS.length - 1 ? (
                  <div
                    className={cn(
                      "mx-2 h-px w-full min-w-[12px] flex-1",
                      complete ? "bg-primary/60" : "bg-border"
                    )}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </SectionCard>
  );
}

export { DecisionTrace } from "@/features/copilot/components/decision-trace-panel";
