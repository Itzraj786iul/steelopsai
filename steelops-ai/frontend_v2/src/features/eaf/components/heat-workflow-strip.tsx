"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileText,
  MessageSquare,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fadeUp, industrialEase, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

type StageId = "predict" | "optimize" | "validate" | "feedback" | "reports";
type StageStatus = "done" | "current" | "todo";

interface StageDef {
  id: StageId;
  label: string;
  href: string;
  icon: typeof Target;
  isDone: (a: HeatSessionSnapshot | null) => boolean;
}

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
    isDone: (a) => !!a?.optimizer || !!a?.recommendationAcceptance,
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
    id: "feedback",
    label: "Feedback",
    href: "/eaf/feedback",
    icon: MessageSquare,
    isDone: (a) => !!a?.recommendationAcceptance,
  },
  {
    id: "reports",
    label: "Reports",
    href: "/eaf/reports",
    icon: FileText,
    isDone: (a) => !!a?.validation?.validatedAt,
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
  currentPage?: StageId;
  className?: string;
}

/**
 * Shared industrial step strip for Prediction / Optimizer / Validation / Feedback / Reports.
 * Lights stages in order and highlights Do next.
 */
export function HeatWorkflowStrip({ active = null, currentPage, className }: HeatWorkflowStripProps) {
  const statuses = stageStatuses(active);
  const byId = Object.fromEntries(statuses.map((s) => [s.id, s.status])) as Record<StageId, StageStatus>;
  const next = STAGES.find((s) => byId[s.id] === "current");
  const doneCount = statuses.filter((s) => s.status === "done").length;
  const progressPct = Math.round((doneCount / STAGES.length) * 100);

  return (
    <div className={cn("rounded-xl border border-border/70 bg-muted/15 p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heat workflow</p>
          <p className="text-sm text-muted-foreground">
            Predict → Optimize → Validate → Feedback → Reports
            {active?.heatNumber ? ` · Heat ${active.heatNumber}` : ""}
          </p>
        </div>
        {next ? (
          <motion.div
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.4, repeat: 2, ease: "easeInOut" }}
          >
            <Button asChild size="sm" className="gap-1.5">
              <Link href={next.href}>
                Do next: {next.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </motion.div>
        ) : (
          <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Heat path complete</Badge>
        )}
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
        className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {STAGES.map((stage, index) => {
          const status = byId[stage.id];
          const Icon = stage.icon;
          const isHere = currentPage === stage.id;
          return (
            <motion.div key={stage.id} variants={fadeUp}>
              <Link
                href={stage.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors focus-ring",
                  status === "done" && "border-emerald-500/35 bg-emerald-500/5",
                  status === "current" && "border-primary/45 bg-primary/8 ring-2 ring-primary/15",
                  status === "todo" && "border-border/50 bg-background/50 opacity-80",
                  isHere && "outline outline-1 outline-offset-1 outline-foreground/20"
                )}
              >
                <motion.span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    status === "done" && "bg-emerald-600 text-white",
                    status === "current" && "bg-primary text-primary-foreground",
                    status === "todo" && "bg-muted text-muted-foreground"
                  )}
                  animate={
                    status === "current"
                      ? {
                          scale: [1, 1.1, 1],
                          boxShadow: [
                            "0 0 0 0 rgba(255,122,26,0.45)",
                            "0 0 0 8px rgba(255,122,26,0)",
                            "0 0 0 0 rgba(255,122,26,0)",
                          ],
                        }
                      : undefined
                  }
                  transition={status === "current" ? { duration: 1.5, repeat: 2 } : undefined}
                >
                  {status === "done" ? "✓" : index + 1}
                </motion.span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {stage.label}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {status === "done" ? "Done" : status === "current" ? "Do next" : "Later"}
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
