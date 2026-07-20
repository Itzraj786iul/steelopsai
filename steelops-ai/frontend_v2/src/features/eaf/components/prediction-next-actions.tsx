"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Database,
  FileText,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/layout/section-card";
import { fadeUp, industrialEase, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { HeatSessionSnapshot } from "@/stores/current-heat-store";

export function OpenPageLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Button asChild variant="outline" size="sm" className={cn("shrink-0 gap-1.5", className)}>
      <Link href={href}>
        {label}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </Button>
  );
}

type StepStatus = "done" | "next" | "todo";

interface WorkflowStep {
  step: number;
  title: string;
  action: string;
  href: string;
  status: StepStatus;
  detail: string;
}

function buildHeatSteps(active: HeatSessionSnapshot | null): WorkflowStep[] {
  const hasPrediction = !!active?.prediction;
  const hasOptimizer = !!active?.optimizer;
  const hasAcceptance = !!active?.recommendationAcceptance;
  const hasValidated = !!active?.validation?.validatedAt;

  const steps: WorkflowStep[] = [
    {
      step: 1,
      title: "Predict cycle time",
      action: "Done on this page",
      href: "/eaf/prediction",
      status: hasPrediction ? "done" : "next",
      detail: "Charge mix entered and cycle time estimated",
    },
    {
      step: 2,
      title: "Optimize & decide",
      action: "Open Optimizer",
      href: "/eaf/optimizer",
      status: !hasPrediction ? "todo" : hasAcceptance ? "done" : hasOptimizer ? "next" : "next",
      detail: "Suggest a better mix, then Accept / Modify / Reject",
    },
    {
      step: 3,
      title: "Record real result",
      action: "Open Validation",
      href: "/eaf/validation",
      status: !hasAcceptance ? "todo" : hasValidated ? "done" : "next",
      detail: "Enter actual cycle time (minutes) and save",
    },
    {
      step: 4,
      title: "Heat report",
      action: "Open Reports",
      href: "/eaf/reports",
      status: hasValidated ? "done" : "todo",
      detail: "Export evidence / open Heat History",
    },
  ];

  let nextAssigned = false;
  return steps.map((s) => {
    if (s.status === "done") return s;
    if (!nextAssigned) {
      nextAssigned = true;
      return { ...s, status: "next" as const };
    }
    return { ...s, status: "todo" as const };
  });
}

function statusBadge(status: StepStatus) {
  if (status === "done") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Done</Badge>;
  if (status === "next") return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Do next</Badge>;
  return <Badge variant="secondary">Later</Badge>;
}

interface ActionItem {
  href: string;
  label: string;
  description: string;
  icon: typeof Cpu;
  emphasize?: boolean;
  status?: "ready" | "done" | "needed";
}

function ActionTile({ item }: { item: ActionItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-full min-w-0 flex-col gap-2 rounded-lg border px-3 py-3 transition-colors focus-ring",
        item.emphasize
          ? "border-primary/45 bg-primary/8 hover:bg-primary/12"
          : "border-border/60 bg-background/70 hover:bg-muted/50",
        item.status === "done" && "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className={cn("h-4 w-4 shrink-0", item.emphasize ? "text-primary" : "text-muted-foreground")} />
          <span className="break-words">{item.label}</span>
        </span>
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 sm:opacity-0" />
      </div>
      <p className="break-words text-xs leading-snug text-muted-foreground">{item.description}</p>
    </Link>
  );
}

interface PredictionNextActionsProps {
  className?: string;
  active?: HeatSessionSnapshot | null;
}

/** Compact operator console — one heat path, no research sprawl. */
export function PredictionNextActions({ className, active = null }: PredictionNextActionsProps) {
  const steps = buildHeatSteps(active);
  const nextStep = steps.find((s) => s.status === "next");

  const primary: ActionItem[] = [
    {
      href: "/eaf/optimizer",
      label: "Optimize mix",
      description: "Suggestions + Accept / Modify / Reject",
      icon: Cpu,
      emphasize: true,
      status: active?.recommendationAcceptance ? "done" : "needed",
    },
    {
      href: "/eaf/validation",
      label: "Record result",
      description: "Enter actual cycle time (minutes) and save this heat",
      icon: CheckCircle2,
      emphasize: true,
      status: active?.validation?.validatedAt ? "done" : "needed",
    },
    {
      href: "/eaf/whatif",
      label: "What-if",
      description: "Try a different charge mix before committing",
      icon: Sparkles,
      status: "ready",
    },
    {
      href: "/eaf/historical",
      label: "Similar history",
      description: "Compare recipe to plant history",
      icon: Database,
      status: "ready",
    },
  ];

  const after: ActionItem[] = [
    {
      href: "/eaf/reports",
      label: "Reports",
      description: "Heat pack export after validation",
      icon: FileText,
    },
    {
      href: "/eaf/heat-history",
      label: "Heat History",
      description: "Permanent saved heats",
      icon: ClipboardList,
    },
  ];

  return (
    <SectionCard
      title="Operator Heat Console"
      description="One path: Predict cycle time → Optimize mix → Record result → Report"
      className={className}
    >
      <motion.div className="space-y-5" variants={staggerContainer} initial="initial" animate="animate">
        {nextStep ? (
          <motion.div variants={fadeUp} className="rounded-lg border border-primary/35 bg-primary/5 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Do next</p>
                <p className="mt-1 text-base font-semibold">
                  Step {nextStep.step}: {nextStep.title}
                </p>
                <p className="text-sm text-muted-foreground">{nextStep.detail}</p>
              </div>
              <motion.div
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}
                className="w-full sm:w-auto"
              >
                <Button asChild className="w-full gap-1.5 sm:w-auto">
                  <Link href={nextStep.href}>
                    {nextStep.action}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : null}

        <motion.div variants={fadeUp}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heat path</p>
          <ol className="space-y-2">
            {steps.map((step, index) => (
              <motion.li
                key={step.step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...industrialEase, delay: index * 0.05 }}
              >
                <Link
                  href={step.href}
                  className={cn(
                    "flex min-w-0 items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors focus-ring",
                    step.status === "next" && "border-primary/40 bg-primary/5",
                    step.status === "done" && "border-emerald-500/30 bg-emerald-500/5",
                    step.status === "todo" && "border-border/50 bg-background/60"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      step.status === "done" && "bg-emerald-600 text-white",
                      step.status === "next" && "bg-primary text-primary-foreground",
                      step.status === "todo" && "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.status === "done" ? "✓" : step.step}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{step.title}</span>
                      {statusBadge(step.status)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{step.detail}</span>
                  </span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </motion.li>
            ))}
          </ol>
        </motion.div>

        <motion.div variants={fadeUp}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick links</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {primary.map((item) => (
              <ActionTile key={item.href} item={item} />
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">After validation</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {after.map((item) => (
              <ActionTile key={item.href} item={item} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </SectionCard>
  );
}
