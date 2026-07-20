"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { EafKpiCard } from "@/features/eaf/components/eaf-kpi-card";
import { eafClient } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

const ADMIN_SHORTCUTS = [
  { href: "/eaf/users", label: "Users" },
  { href: "/eaf/audit-log", label: "Audit log" },
  { href: "/eaf/furnaces", label: "Furnaces" },
  { href: "/eaf/shifts", label: "Shifts" },
  { href: "/eaf/settings", label: "Settings" },
  { href: "/eaf/system-health", label: "System health" },
  { href: "/eaf/session-backup", label: "Session backup" },
] as const;

export function AdminDashboardView() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eafClient
      .get("/admin/dashboard")
      .then(({ data: d }) => setData(d as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load admin dashboard")));
  }, []);

  return (
    <PageContainer title="Admin Dashboard" description="Platform health, IAM, and plant configuration">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <SectionCard title="Admin console" description="Primary jobs — identity, compliance, plant config" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {ADMIN_SHORTCUTS.map((item) => (
            <Button key={item.href} asChild size="sm" variant="outline">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </SectionCard>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <EafKpiCard title="API Health" value={String(data?.api_health ?? "—")} />
        <EafKpiCard title="Database" value={String(data?.database ?? "—")} />
        <EafKpiCard title="Active Users" value={String(data?.active_users ?? "—")} />
        <EafKpiCard title="Active Sessions" value={String(data?.active_sessions ?? "—")} />
        <EafKpiCard title="Predictions (DB)" value={String(data?.prediction_count ?? "—")} />
        <EafKpiCard title="Optimizations (DB)" value={String(data?.optimization_count ?? "—")} />
        <EafKpiCard title="Open Alerts" value={String(data?.open_alerts ?? "—")} />
        <EafKpiCard title="Audit Events" value={String(data?.audit_events ?? "—")} />
        <EafKpiCard title="Failed Logins" value={String(data?.failed_logins ?? "—")} />
        <EafKpiCard title="Locked Accounts" value={String(data?.locked_accounts ?? "—")} />
        <EafKpiCard title="App Version" value={String(data?.app_version ?? "—")} />
      </div>
      <SectionCard title="Model registry" className="mt-6">
        <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs">
          {JSON.stringify(data?.model_versions ?? {}, null, 2)}
        </pre>
      </SectionCard>
    </PageContainer>
  );
}
