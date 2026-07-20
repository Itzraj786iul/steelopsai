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
 * Hides redundant "Do next" when the operator is already on that step.
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
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border/70 bg-muted/15 p-3 sm:p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heat workflow</p>
          <p className="text-sm text-muted-foreground">
            Predict → Optimize → Validate → Report
            {active?.heatNumber ? ` · Heat ${active.heatNumber}` : ""}
          </p>
        </div>
        {pathComplete ? (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Badge className="w-fit bg-emerald-600 text-white hover:bg-emerald-600">Heat saved</Badge>
            <NewHeatButton />
          </div>
        ) : showDoNext ? (
          <Button asChild size="sm" className="w-full gap-1.5 sm:w-auto">
            <Link href={next.href}>
              Do next: {next.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : next ? (
          <p className="text-sm text-muted-foreground">You are on {next.label} — continue below</p>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>Progress</span>
          <span className="font-mono">{progressPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted/80">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ ...industrialEase, duration: 0.45 }}
          />
        </div>
      </div>

      <motion.div
        className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-4 sm:overflow-visible sm:pb-0"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {STAGES.map((stage, index) => {
          const status = byId[stage.id];
          const Icon = stage.icon;
          const isHere = page === stage.id;
          return (
            <motion.div key={stage.id} variants={fadeUp} className="min-w-[9.5rem] shrink-0 sm:min-w-0">
              <Link
                href={stage.href}
                className={cn(
                  "flex h-full items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors focus-ring",
                  status === "done" && "border-emerald-500/35 bg-emerald-500/5",
                  status === "current" && "border-primary/45 bg-primary/8 ring-2 ring-primary/15",
                  status === "todo" && "border-border/50 bg-background/50 opacity-80",
                  isHere && "outline outline-1 outline-offset-1 outline-foreground/20"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    status === "done" && "bg-emerald-600 text-white",
                    status === "current" && "bg-primary text-primary-foreground",
                    status === "todo" && "bg-muted text-muted-foreground"
                  )}
                >
                  {status === "done" ? "✓" : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 truncate text-sm font-semibold">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {stage.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {status === "done" ? "Done" : status === "current" ? "In progress" : "Later"}
                    {isHere ? " · here" : ""}
                  </span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
