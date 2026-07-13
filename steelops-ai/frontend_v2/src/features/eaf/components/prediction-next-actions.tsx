"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  FileSearch,
  FileText,
  Gauge,
  Layers,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const WORKFLOW_LINKS: {
  href: string;
  label: string;
  description: string;
  icon: typeof Cpu;
  primary?: boolean;
}[] = [
  {
    href: "/eaf/optimizer",
    label: "Optimizer",
    description: "Recommend recipe changes for this heat",
    icon: Cpu,
    primary: true,
  },
  {
    href: "/eaf/historical",
    label: "Historical",
    description: "Compare against similar plant heats",
    icon: Database,
  },
  {
    href: "/eaf/whatif",
    label: "What-if",
    description: "Stress-test burden and energy inputs",
    icon: Sparkles,
  },
  {
    href: "/eaf/validation",
    label: "Validation",
    description: "Record actual TTT after tap",
    icon: CheckCircle2,
  },
  {
    href: "/eaf/explainability",
    label: "Explainability",
    description: "Drivers, SHAP, and trust detail",
    icon: FileSearch,
  },
  {
    href: "/eaf/reliability",
    label: "Reliability",
    description: "Hybrid trust and confidence bands",
    icon: Gauge,
  },
  {
    href: "/eaf/digital-twin-readiness",
    label: "Digital Twin",
    description: "Readiness score for this prediction",
    icon: Layers,
  },
  {
    href: "/eaf/reports",
    label: "Reports",
    description: "Export heat session evidence",
    icon: FileText,
  },
];

/** Operator shortcuts shown after a successful prediction. */
export function PredictionNextActions({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Continue from this prediction</p>
          <p className="text-xs text-muted-foreground">
            Recipe is saved on the current heat — open any related page without re-entering inputs.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {WORKFLOW_LINKS.map(({ href, label, description, icon: Icon, primary }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors focus-ring",
              primary
                ? "border-primary/40 bg-primary/5 hover:bg-primary/10"
                : "border-border/60 bg-background/60 hover:bg-muted/60"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                primary ? "text-primary" : "text-muted-foreground"
              )}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                {label}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
