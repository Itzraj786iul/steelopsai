"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Cpu, FileText, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { isHeatPathComplete } from "@/lib/heat-lifecycle";
import { fadeUp, industrialEase, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

type StageId = "predict" | "optimize" | "validate" | "complete";
type StageStatus = "done" | "current" | "todo";

interface StageDef {
  id: StageId;
  label: string;
  href: string;
  icon: typeof Target;
  isDone: (a: HeatSessionSnapshot | null) => boolean;
}

/** Single industrial heat path — Predict → Optimize → Validate → Report. */
const STAGES: StageDef[] = [
  {
    id: "predict",
    label: "Predict",
    href: "/eaf/prediction",
    icon: Target,
    isDone: (a) => !!a?.prediction,
  },
  {
    id: "optimize",
    label: "Optimize",
    href: "/eaf/optimizer",
    icon: Cpu,
    isDone: (a) => !!a?.recommendationLocked,
  },
  {
    id: "validate",
    label: "Validate",
    href: "/eaf/validation",
    icon: CheckCircle2,
    isDone: (a) => {
      const v = a?.validation?.actualTtt;
      return (!!v && v !== "Pending" && !Number.isNaN(parseFloat(v))) || !!a?.validation?.validatedAt;
    },
  },
  {
    id: "complete",
    label: "Report",
    href: "/eaf/reports",
    icon: FileText,
    isDone: (a) => !!a?.validation?.validatedAt || isHeatPathComplete(a),
  },
];

const STAGE_BLURBS: Record<StageId, string> = {
  predict: "Estimate minutes",
  optimize: "Safer mix options",
  validate: "Enter real minutes",
  complete: "Heat package",
};

function stageStatuses(active: HeatSessionSnapshot | null): { id: StageId; status: StageStatus }[] {
  let currentSet = false;
  return STAGES.map((stage) => {
    if (stage.isDone(active)) return { id: stage.id, status: "done" as const };
    if (!currentSet) {
      currentSet = true;
      return { id: stage.id, status: "current" as const };
    }
    return { id: stage.id, status: "todo" as const };
  });
}

interface HeatWorkflowStripProps {
  active?: HeatSessionSnapshot | null;
  currentPage?: StageId | "reports";
  className?: string;
}

/**
 * Shared industrial step strip: Predict → Optimize → Validate → Report.
 * Dense HMI chrome — one job signal, clear current step, minimal chrome height.
 */
export function HeatWorkflowStrip({ active = null, currentPage, className }: HeatWorkflowStripProps) {
  const page: StageId | undefined = currentPage === "reports" ? "complete" : currentPage;

  const statuses = stageStatuses(active);
  const byId = Object.fromEntries(statuses.map((s) => [s.id, s.status])) as Record<StageId, StageStatus>;
  const next = STAGES.find((s) => byId[s.id] === "current");
  const doneCount = statuses.filter((s) => s.status === "done").length;
  const progressPct = Math.round((doneCount / STAGES.length) * 100);
  const pathComplete = isHeatPathComplete(active) || doneCount === STAGES.length;
  const showDoNext = !!next && page !== next.id && !pathComplete;

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border border-border/80 bg-card shadow-elevation-sm",
        className
      )}
    >
      <div className="flex flex-col gap-2 border-b border-border/60 bg-muted/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Heat path</p>
            {active?.heatNumber ? (
              <Badge variant="outline" className="font-mono text-[11px]">
                {active.heatNumber}
              </Badge>
            ) : (
              <span className="text-[11px] text-muted-foreground">No heat ID yet</span>
            )}
            <span className="hidden text-[11px] text-muted-foreground sm:inline">·</span>
            <span className="text-[11px] text-muted-foreground">
              {doneCount}/{STAGES.length} done · {progressPct}%
            </span>
          </div>
        </div>
        {pathComplete ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Badge className="w-fit bg-success text-background hover:bg-success">Heat saved</Badge>
            <NewHeatButton />
          </div>
        ) : showDoNext ? (
          <Button asChild size="sm" className="w-full gap-1.5 sm:w-auto">
            <Link href={next.href}>
              Next: {next.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : next ? (
          <p className="text-xs font-medium text-primary">On {next.label} — finish this step below</p>
        ) : null}
      </div>

      <div className="px-3 pb-1 pt-2 sm:px-4">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ ...industrialEase, duration: 0.45 }}
          />
        </div>
      </div>

      <motion.div
        className="-mx-0.5 flex gap-0 overflow-x-auto px-2 pb-3 pt-2 sm:grid sm:grid-cols-4 sm:gap-0 sm:overflow-visible sm:px-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {STAGES.map((stage, index) => {
          const status = byId[stage.id];
          const Icon = stage.icon;
          const isHere = page === stage.id;
          const isLast = index === STAGES.length - 1;
          return (
            <motion.div key={stage.id} variants={fadeUp} className="relative min-w-[8.75rem] shrink-0 sm:min-w-0">
              {!isLast ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[calc(50%+1.75rem)] right-0 top-[1.15rem] hidden h-px sm:block",
                    status === "done" || byId[STAGES[index + 1].id] !== "todo" ? "bg-success/50" : "bg-border"
                  )}
                />
              ) : null}
              <Link
                href={stage.href}
                aria-current={isHere ? "step" : undefined}
                className={cn(
                  "relative z-[1] mx-1 flex h-full flex-col gap-1 rounded-md border px-2.5 py-2.5 transition-colors focus-ring",
                  status === "done" && "border-success/40 bg-success/5 hover:bg-success/10",
                  status === "current" && "border-primary/50 bg-primary/8 ring-2 ring-primary/20 hover:bg-primary/12",
                  status === "todo" && "border-transparent bg-transparent opacity-70 hover:border-border hover:bg-muted/40 hover:opacity-100",
                  isHere && "outline outline-1 outline-offset-1 outline-foreground/25"
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      status === "done" && "bg-success text-background",
                      status === "current" && "bg-primary text-primary-foreground",
                      status === "todo" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {status === "done" ? "✓" : index + 1}
                  </span>
                  <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{stage.label}</span>
                  </span>
                </span>
                <span className="pl-8 text-[11px] leading-snug text-muted-foreground">
                  {STAGE_BLURBS[stage.id]}
                  {isHere ? " · you are here" : status === "done" ? " · done" : ""}
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
