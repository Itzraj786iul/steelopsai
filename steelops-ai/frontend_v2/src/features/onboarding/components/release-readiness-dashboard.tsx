"use client";

import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { buildReleaseReadiness } from "@/features/onboarding/utils/onboarding-data";
import { APP_VERSION } from "@/lib/constants";
import { cn } from "@/lib/utils";

const statusIcon = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  fail: XCircle,
  pending: Clock,
};

const statusColor = {
  pass: "text-accent",
  warn: "text-amber-500",
  fail: "text-destructive",
  pending: "text-muted-foreground",
};

export function ReleaseReadinessDashboard() {
  const checks = buildReleaseReadiness().map((c) =>
    c.id === "frontend" ? { ...c, version: APP_VERSION } : c
  );

  const passCount = checks.filter((c) => c.status === "pass").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-label">Release readiness</p>
        <p className="mt-2 font-mono text-4xl font-bold">
          {passCount}/{checks.length}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Systems ready for pilot deployment</p>
      </div>

      <SectionCard title="System health" description="Frontend, backend, model, APIs, and deployment">
        <div className="grid gap-3 sm:grid-cols-2">
          {checks.map((check) => {
            const Icon = statusIcon[check.status];
            return (
              <div key={check.id} className="flex gap-3 rounded-lg border border-border/60 p-4">
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", statusColor[check.status])} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{check.label}</p>
                    {check.version ? (
                      <span className="font-mono text-xs text-muted-foreground">v{check.version}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
