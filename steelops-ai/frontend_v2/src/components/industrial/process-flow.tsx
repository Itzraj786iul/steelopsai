"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { INDUSTRIAL_CHART } from "./chart-theme";
import type { FlowStep } from "./types";

const DEFAULT_STAGES = ["Charging", "Melting", "Oxidation", "Refining", "Tapping"] as const;

interface ProcessFlowProps {
  stages?: readonly string[];
  activeIndex?: number;
  className?: string;
}

export const ProcessFlow = memo(function ProcessFlow({
  stages = DEFAULT_STAGES,
  activeIndex = 1,
  className,
}: ProcessFlowProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1", className)} role="list" aria-label="Process flow">
      {stages.map((stage, i) => {
        const active = i === activeIndex;
        const complete = i < activeIndex;
        return (
          <div key={stage} className="flex w-full flex-col items-center" role="listitem">
            <motion.div
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-center text-sm font-medium transition-colors",
                active && "border-primary bg-primary/15 text-primary shadow-glow-primary",
                complete && "border-accent/40 bg-accent/10 text-accent",
                !active && !complete && "border-border/60 bg-muted/20 text-muted-foreground"
              )}
              animate={active ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 2, repeat: active ? Infinity : 0 }}
            >
              {stage}
            </motion.div>
            {i < stages.length - 1 ? <ChevronDown className="my-0.5 h-4 w-4 text-muted-foreground/50" aria-hidden /> : null}
          </div>
        );
      })}
    </div>
  );
});

const PLANT_FLOW = ["Raw Materials", "Bucket", "EAF", "Refining", "Tap", "Caster"] as const;

interface AnimatedPipelineProps {
  steps?: readonly string[];
  activeIndex?: number;
  horizontal?: boolean;
  className?: string;
}

export const AnimatedPipeline = memo(function AnimatedPipeline({
  steps = PLANT_FLOW,
  activeIndex = 2,
  horizontal = true,
  className,
}: AnimatedPipelineProps) {
  if (!horizontal) {
    return <ProcessFlow stages={steps} activeIndex={activeIndex} className={className} />;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)} role="list" aria-label="Plant pipeline">
      {steps.map((step, i) => {
        const active = i === activeIndex;
        const complete = i < activeIndex;
        return (
          <div key={step} className="flex items-center gap-1" role="listitem">
            <motion.span
              className={cn(
                "rounded-md border px-2 py-1 text-xs font-medium",
                active && "border-primary bg-primary/20 text-primary",
                complete && "border-accent/50 bg-accent/10 text-accent",
                !active && !complete && "border-border/60 text-muted-foreground"
              )}
              animate={active ? { boxShadow: ["0 0 0px transparent", "0 0 12px rgba(255,122,26,0.35)", "0 0 0px transparent"] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {step}
            </motion.span>
            {i < steps.length - 1 ? <span className="text-muted-foreground/40">→</span> : null}
          </div>
        );
      })}
    </div>
  );
});

export const StageProgress = ProcessFlow;

interface OperatorActionTimelineProps {
  actions: string[];
  className?: string;
}

export const OperatorActionTimeline = memo(function OperatorActionTimeline({ actions, className }: OperatorActionTimelineProps) {
  return (
    <div className={cn("relative space-y-0 pl-6", className)} role="list" aria-label="Operator actions">
      <div className="absolute bottom-2 left-2 top-2 w-px bg-border" aria-hidden />
      {actions.map((action, i) => (
        <motion.div
          key={`${action}-${i}`}
          role="listitem"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="relative pb-4 last:pb-0"
        >
          <span
            className="absolute -left-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-bold text-primary"
            aria-hidden
          >
            {i + 1}
          </span>
          <p className="text-sm leading-relaxed">{action}</p>
        </motion.div>
      ))}
    </div>
  );
});

interface RecommendationFlowProps {
  steps: FlowStep[];
  className?: string;
}

export const RecommendationFlow = memo(function RecommendationFlow({ steps, className }: RecommendationFlowProps) {
  return (
    <div className={cn("space-y-2", className)} role="list" aria-label="Recommendation pipeline">
      {steps.map((step, i) => (
        <div key={step.id} role="listitem">
          <motion.div
            className={cn(
              "rounded-xl border p-4",
              step.status === "active" && "border-primary/50 bg-primary/10",
              step.status === "complete" && "border-accent/40 bg-accent/5",
              step.status === "warning" && "border-warning/40 bg-warning/5",
              (!step.status || step.status === "pending") && "border-border/60 bg-muted/10"
            )}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <p className="text-label">{step.label}</p>
            {step.value ? <p className="mt-1 font-mono text-lg font-semibold">{step.value}</p> : null}
            {step.description ? <p className="mt-1 text-sm text-muted-foreground">{step.description}</p> : null}
          </motion.div>
          {i < steps.length - 1 ? (
            <div className="flex justify-center py-1">
              <ChevronDown className="h-4 w-4 text-muted-foreground/50" aria-hidden />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
});

export const DecisionTree = RecommendationFlow;

interface ExecutionPathProps {
  steps: FlowStep[];
  className?: string;
}

export const ExecutionPath = memo(function ExecutionPath({ steps, className }: ExecutionPathProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex min-w-[640px] items-start gap-2" role="list">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-1 items-start gap-2" role="listitem">
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "rounded-lg border px-3 py-2 text-center",
                  step.status === "complete" && "border-accent bg-accent/10",
                  step.status === "active" && "border-primary bg-primary/15",
                  step.status === "pending" && "border-border bg-muted/20"
                )}
              >
                <p className="text-[10px] uppercase text-muted-foreground">{step.label}</p>
                {step.value ? <p className="mt-0.5 truncate text-xs font-medium">{step.value}</p> : null}
              </div>
            </div>
            {i < steps.length - 1 ? (
              <motion.div
                className="mt-4 h-px w-4 shrink-0 bg-border"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.08 }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
});

export const HeatTimeline = ExecutionPath;

interface ExecutionTimelineProps {
  activeStep: number;
  className?: string;
}

const EXEC_STEPS = ["Prediction", "Recommendation", "Approval", "Execution", "Actual", "Learning"] as const;

export const ExecutionTimeline = memo(function ExecutionTimeline({ activeStep, className }: ExecutionTimelineProps) {
  const steps: FlowStep[] = EXEC_STEPS.map((label, i) => ({
    id: label.toLowerCase(),
    label,
    status: i + 1 < activeStep ? "complete" : i + 1 === activeStep ? "active" : "pending",
  }));
  return <ExecutionPath steps={steps} className={className} />;
});

export function resolveStageIndex(stageName?: string): number {
  const s = (stageName ?? "melt").toLowerCase();
  if (s.includes("charg")) return 0;
  if (s.includes("melt")) return 1;
  if (s.includes("oxid")) return 2;
  if (s.includes("refin")) return 3;
  if (s.includes("tap")) return 4;
  return 1;
}

export { INDUSTRIAL_CHART };
