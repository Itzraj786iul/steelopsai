"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, CircleDot } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import {
  HEAT_LIFECYCLE_STAGES,
  type HeatLifecycleStageId,
  lifecycleStageStatus,
} from "@/lib/heat-lifecycle";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { fadeUp, industrialEase, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

const STAGE_HREF: Partial<Record<HeatLifecycleStageId, string>> = {
  recipe_entered: "/eaf/prediction",
  prediction_complete: "/eaf/prediction",
  optimization_complete: "/eaf/optimizer",
  operator_review: "/eaf/optimizer",
  validation: "/eaf/validation",
  archived: "/eaf/heat-history",
};

interface HeatLifecycleTimelineProps {
  active: HeatSessionSnapshot | null;
  compact?: boolean;
}

export function HeatLifecycleTimeline({ active, compact = false }: HeatLifecycleTimelineProps) {
  if (!active) return null;

  const completed = HEAT_LIFECYCLE_STAGES.filter((s) => lifecycleStageStatus(s.id, active) === "completed").length;
  const progressPct = Math.round((completed / HEAT_LIFECYCLE_STAGES.length) * 100);

  const content = (
    <motion.div
      className={cn("flex flex-col", compact ? "gap-1" : "gap-0")}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {!compact ? (
        <div className="mb-4">
          <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>Lifecycle progress</span>
            <span className="font-mono">{progressPct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ ...industrialEase, duration: 0.5 }}
            />
          </div>
        </div>
      ) : null}

      {HEAT_LIFECYCLE_STAGES.map((stage, index) => {
        const status = lifecycleStageStatus(stage.id, active);
        const isLast = index === HEAT_LIFECYCLE_STAGES.length - 1;
        const href = STAGE_HREF[stage.id];

        const body = (
          <>
            <p
              className={cn(
                "text-sm font-medium",
                status === "completed" && "text-emerald-700 dark:text-emerald-400",
                status === "current" && "text-blue-700 dark:text-blue-400",
                status === "pending" && "text-muted-foreground",
                href && "group-hover:underline"
              )}
            >
              {stage.label}
            </p>
            {status === "current" && !compact ? (
              <p className="text-xs text-muted-foreground">
                Current stage{href ? " — tap to open" : ""}
              </p>
            ) : null}
          </>
        );

        return (
          <motion.div key={stage.id} className="flex gap-3" variants={fadeUp}>
            <div className="flex flex-col items-center">
              {status === "completed" ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ ...industrialEase, delay: index * 0.04 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Completed" />
                </motion.span>
              ) : status === "current" ? (
                <motion.span
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.4, repeat: 2 }}
                >
                  <CircleDot className="h-4 w-4 text-blue-600" aria-label="Current stage" />
                </motion.span>
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50" aria-label="Pending" />
              )}
              {!isLast ? (
                <motion.div
                  className={cn(
                    "my-0.5 w-px flex-1 min-h-[1rem]",
                    status === "completed" ? "bg-emerald-500/60" : "bg-border"
                  )}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  style={{ originY: 0 }}
                  transition={{ ...industrialEase, delay: 0.05 + index * 0.04 }}
                />
              ) : null}
            </div>
            <div className={cn("pb-3", isLast && "pb-0")}>
              {href ? (
                <Link href={href} className="group rounded focus-ring">
                  {body}
                </Link>
              ) : (
                body
              )}
            </div>
          </motion.div>
        );
      })}
    </motion.div>
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
    <SectionCard title="Heat Lifecycle" description="Stages light up as the heat advances — tap to open">
      {content}
    </SectionCard>
  );
}
