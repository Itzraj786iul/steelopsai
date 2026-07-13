"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Cpu,
  Database,
  FileSearch,
  FileText,
  Gauge,
  Layers,
  LayoutGrid,
  LineChart,
  ListOrdered,
  MessageSquare,
  Sparkles,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/layout/section-card";
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

type StepStatus = "done" | "next" | "todo" | "optional";

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
  const hasActual =
    !!active?.validation?.actualTtt &&
    active.validation.actualTtt !== "Pending" &&
    !Number.isNaN(parseFloat(active.validation.actualTtt));
  const hasFeedback = hasAcceptance; // acceptance is the operator decision gate
  const hasValidated = !!active?.validation?.validatedAt;

  const steps: WorkflowStep[] = [
    {
      step: 1,
      title: "Predict TTT",
      action: "Done on this page",
      href: "/eaf/prediction",
      status: hasPrediction ? "done" : "next",
      detail: "Burden entered and TTT predicted",
    },
    {
      step: 2,
      title: "Optimize recipe",
      action: "Open Optimizer",
      href: "/eaf/optimizer",
      status: !hasPrediction ? "todo" : hasOptimizer ? "done" : "next",
      detail: "Get recommended burden / energy changes",
    },
    {
      step: 3,
      title: "Accept or modify",
      action: "Operator decision",
      href: "/eaf/optimizer",
      status: !hasOptimizer ? "todo" : hasAcceptance ? "done" : "next",
      detail: "Accept, modify, or reject recommendation",
    },
    {
      step: 4,
      title: "Record actual TTT",
      action: "Open Validation",
      href: "/eaf/validation",
      status: !hasPrediction ? "todo" : hasActual || hasValidated ? "done" : hasOptimizer ? "next" : "todo",
      detail: "Enter actual tap-to-tap after the heat",
    },
    {
      step: 5,
      title: "Operator feedback",
      action: "Open Feedback",
      href: "/eaf/feedback",
      status: hasFeedback ? "done" : "optional",
      detail: "Capture floor notes for this heat",
    },
    {
      step: 6,
      title: "Close & report",
      action: "Open Reports",
      href: "/eaf/reports",
      status: hasValidated ? "done" : "optional",
      detail: "Export evidence / heat pack",
    },
  ];

  // Ensure only one "next" highlight (first incomplete required step).
  let nextAssigned = false;
  return steps.map((s) => {
    if (s.status === "done" || s.status === "optional") return s;
    if (!nextAssigned && (s.status === "next" || s.status === "todo")) {
      nextAssigned = true;
      return { ...s, status: "next" as const };
    }
    return { ...s, status: s.status === "next" ? ("todo" as const) : s.status };
  });
}

interface ActionItem {
  href: string;
  label: string;
  description: string;
  icon: typeof Cpu;
  status?: "ready" | "done" | "needed";
  emphasize?: boolean;
}

function statusBadge(status: StepStatus) {
  if (status === "done") return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Done</Badge>;
  if (status === "next") return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Do next</Badge>;
  if (status === "optional") return <Badge variant="outline">Optional</Badge>;
  return <Badge variant="secondary">Later</Badge>;
}

function ActionTile({ item }: { item: ActionItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-full flex-col gap-2 rounded-lg border px-3 py-3 transition-colors focus-ring",
        item.emphasize
          ? "border-primary/45 bg-primary/8 hover:bg-primary/12"
          : "border-border/60 bg-background/70 hover:bg-muted/50",
        item.status === "done" && "border-emerald-500/30 bg-emerald-500/5"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className={cn("h-4 w-4 shrink-0", item.emphasize ? "text-primary" : "text-muted-foreground")} />
          {item.label}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{item.description}</p>
      {item.status === "needed" ? (
        <span className="mt-auto text-[11px] font-medium text-amber-700 dark:text-amber-400">Action needed</span>
      ) : item.status === "done" ? (
        <span className="mt-auto text-[11px] font-medium text-emerald-700 dark:text-emerald-400">Completed</span>
      ) : null}
    </Link>
  );
}

interface PredictionNextActionsProps {
  className?: string;
  active?: HeatSessionSnapshot | null;
}

/** Industrial operator console — all heat follow-ups without hunting the navbar. */
export function PredictionNextActions({ className, active = null }: PredictionNextActionsProps) {
  const steps = buildHeatSteps(active);
  const nextStep = steps.find((s) => s.status === "next") ?? steps.find((s) => s.status === "todo");

  const actNow: ActionItem[] = [
    {
      href: "/eaf/optimizer",
      label: "1 · Optimizer",
      description: "Recommended recipe changes for this heat",
      icon: Cpu,
      emphasize: true,
      status: active?.optimizer ? "done" : "needed",
    },
    {
      href: "/eaf/validation",
      label: "2 · Validation",
      description: "Enter actual TTT and close the heat",
      icon: CheckCircle2,
      emphasize: true,
      status: active?.validation?.validatedAt ? "done" : "needed",
    },
    {
      href: "/eaf/feedback",
      label: "3 · Operator Feedback",
      description: "Floor notes, issues, and heat comments",
      icon: MessageSquare,
      status: active?.recommendationAcceptance ? "done" : "ready",
    },
    {
      href: "/eaf/whatif",
      label: "What-if",
      description: "Test alternate HM / DRI / energy before commit",
      icon: Sparkles,
      status: "ready",
    },
  ];

  const understand: ActionItem[] = [
    {
      href: "/eaf/historical",
      label: "Historical Analysis",
      description: "Compare this recipe to plant history",
      icon: Database,
    },
    {
      href: "/eaf/explainability",
      label: "Explainability",
      description: "Why the model predicted this TTT",
      icon: FileSearch,
    },
    {
      href: "/eaf/reliability",
      label: "Reliability / Trust",
      description: "Hybrid confidence and consensus",
      icon: Gauge,
    },
    {
      href: "/eaf/model",
      label: "Model Insights",
      description: "Feature drivers and model status",
      icon: LineChart,
    },
    {
      href: "/eaf/digital-twin-readiness",
      label: "Digital Twin",
      description: "Readiness score for this prediction",
      icon: Layers,
    },
    {
      href: "/eaf/health",
      label: "Process Health",
      description: "Operating gauges vs historical bands",
      icon: Activity,
    },
  ];

  const recordClose: ActionItem[] = [
    {
      href: "/eaf/reports",
      label: "Reports",
      description: "Export heat pack / evidence",
      icon: FileText,
    },
    {
      href: "/eaf/heat-history",
      label: "Heat History",
      description: "Saved heats and prior sessions",
      icon: ClipboardList,
    },
    {
      href: "/eaf/operator-board",
      label: "Operator Board",
      description: "Your shift board and assigned heats",
      icon: UserCheck,
    },
    {
      href: "/eaf/tasks",
      label: "My Tasks",
      description: "Approvals and follow-up tasks",
      icon: CheckSquare,
    },
  ];

  const shiftSupport: ActionItem[] = [
    {
      href: "/eaf/live-board",
      label: "Live Board",
      description: "Current furnace / heat status",
      icon: LayoutGrid,
    },
    {
      href: "/eaf/heat-queue",
      label: "Heat Queue",
      description: "Upcoming heats in the queue",
      icon: ListOrdered,
    },
    {
      href: "/eaf/alerts",
      label: "Alerts",
      description: "Plant and system alerts",
      icon: AlertTriangle,
    },
    {
      href: "/eaf/dashboard",
      label: "Dashboard",
      description: "Shift overview and KPIs",
      icon: Gauge,
    },
  ];

  return (
    <SectionCard
      title="Operator Heat Console"
      description="Stay on the heat workflow — open every next page from here. No navbar hunting required."
      className={className}
      actions={
        nextStep ? (
          <Button asChild size="sm" className="gap-1.5">
            <Link href={nextStep.href}>
              Next: {nextStep.title}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="mb-5 rounded-lg border border-blue-500/30 bg-blue-500/5 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
              Recommended heat path
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Heat {active?.heatNumber || "—"} · Shift {active?.shift || recipeShiftFallback(active)} · Recipe stays
              linked across all pages
            </p>
          </div>
          {nextStep ? (
            <Button asChild>
              <Link href={nextStep.href} className="gap-2">
                Continue → {nextStep.action}
              </Link>
            </Button>
          ) : null}
        </div>

        <ol className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step) => (
            <li key={step.step}>
              <Link
                href={step.href}
                className={cn(
                  "flex h-full items-start gap-3 rounded-lg border px-3 py-3 transition-colors focus-ring",
                  step.status === "next" && "border-blue-500/50 bg-background shadow-sm",
                  step.status === "done" && "border-emerald-500/30 bg-emerald-500/5",
                  step.status === "todo" && "border-border/50 bg-background/50 opacity-80",
                  step.status === "optional" && "border-dashed border-border/60 bg-background/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    step.status === "done" && "bg-emerald-600 text-white",
                    step.status === "next" && "bg-blue-600 text-white",
                    (step.status === "todo" || step.status === "optional") && "bg-muted text-muted-foreground"
                  )}
                >
                  {step.status === "done" ? "✓" : step.step}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{step.title}</span>
                    {statusBadge(step.status)}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{step.detail}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    {step.action}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      <ActionGroup title="Act now — decide & close the heat" items={actNow} />
      <ActionGroup title="Understand this prediction" items={understand} className="mt-5" />
      <ActionGroup title="Record, history & board" items={recordClose} className="mt-5" />
      <ActionGroup title="Shift support" items={shiftSupport} className="mt-5" />

      <p className="mt-4 text-xs text-muted-foreground">
        Tip: after Predict, use <span className="font-medium text-foreground">Continue → Optimizer</span>, then
        Validation and Feedback. Sidebar remains available, but this console is the fastest floor path.
      </p>
    </SectionCard>
  );
}

function ActionGroup({
  title,
  items,
  className,
}: {
  title: string;
  items: ActionItem[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <ActionTile key={item.href + item.label} item={item} />
        ))}
      </div>
    </div>
  );
}

function recipeShiftFallback(active: HeatSessionSnapshot | null): string {
  return active?.recipe?.Shift ?? "—";
}
