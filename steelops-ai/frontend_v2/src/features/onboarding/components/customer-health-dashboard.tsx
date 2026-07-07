"use client";

import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { buildCustomerHealth } from "@/features/onboarding/utils/onboarding-data";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { cn } from "@/lib/utils";

const statusIcon = {
  healthy: CheckCircle2,
  warning: AlertTriangle,
  critical: XCircle,
  pending: Activity,
};

const statusColor = {
  healthy: "text-accent",
  warning: "text-amber-500",
  critical: "text-destructive",
  pending: "text-muted-foreground",
};

export function CustomerHealthDashboard() {
  const { wizardCompleted, tourCompleted, welcomeCompleted } = useOnboardingStore();
  const metrics = buildCustomerHealth();

  const installPct = [welcomeCompleted, wizardCompleted, tourCompleted].filter(Boolean).length;
  const installValue = `${Math.round((installPct / 3) * 100)}%`;

  return (
    <SectionCard title="Customer health" description="Installation, connectivity, and AI readiness at a glance">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = statusIcon[metric.status];
          const value = metric.id === "install" ? installValue : metric.value;
          return (
            <div key={metric.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2">
                <Icon className={cn("h-4 w-4", statusColor[metric.status])} />
                <p className="text-sm font-medium">{metric.label}</p>
              </div>
              <p className="mt-2 font-mono text-2xl">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
