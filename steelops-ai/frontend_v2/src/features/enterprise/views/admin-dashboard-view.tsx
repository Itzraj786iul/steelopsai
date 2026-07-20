"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  HardDrive,
  ScrollText,
  Settings,
  Shield,
  Users,
  Factory,
  Clock,
  Activity,
} from "lucide-react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ShortcutBar } from "@/components/layout/shortcut-bar";
import { KpiStrip, humanizeKey } from "@/components/layout/kpi-strip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { eafClient } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

const ADMIN_SHORTCUTS = [
  { href: "/eaf/users", label: "Users", icon: Users },
  { href: "/eaf/audit-log", label: "Audit log", icon: ScrollText },
  { href: "/eaf/furnaces", label: "Furnaces", icon: Factory },
  { href: "/eaf/shifts", label: "Shifts", icon: Clock },
  { href: "/eaf/settings", label: "Settings", icon: Settings },
  { href: "/eaf/system-health", label: "System health", icon: Activity },
  { href: "/eaf/session-backup", label: "Session backup", variant: "ghost" as const, icon: HardDrive },
];

export function AdminDashboardView() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    eafClient
      .get("/admin/dashboard")
      .then(({ data: d }) => setData(d as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load admin dashboard")))
      .finally(() => setLoading(false));
  }, []);

  const models = (data?.model_versions ?? {}) as Record<string, unknown>;

  return (
    <PageContainer
      title="Admin Dashboard"
      description="Platform health, IAM, and plant configuration"
      actions={
        <Button asChild size="sm" variant="outline">
          <Link href="/eaf/system-health">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            Health
          </Link>
        </Button>
      }
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      <ShortcutBar
        title="Admin console"
        description="Primary jobs — identity, compliance, plant config"
        items={ADMIN_SHORTCUTS}
      />

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">Loading platform metrics…</p>
      ) : (
        <>
          <KpiStrip
            items={[
              { label: "API Health", value: String(data?.api_health ?? "—"), highlight: true },
              { label: "Database", value: String(data?.database ?? "—") },
              { label: "Active Users", value: String(data?.active_users ?? "—") },
              { label: "Active Sessions", value: String(data?.active_sessions ?? "—") },
            ]}
          />
          <KpiStrip
            items={[
              { label: "Predictions (DB)", value: String(data?.prediction_count ?? "—") },
              { label: "Optimizations (DB)", value: String(data?.optimization_count ?? "—") },
              { label: "Open Alerts", value: String(data?.open_alerts ?? "—") },
              { label: "Audit Events", value: String(data?.audit_events ?? "—") },
            ]}
          />
          <KpiStrip
            columns={3}
            items={[
              { label: "Failed Logins", value: String(data?.failed_logins ?? "—") },
              { label: "Locked Accounts", value: String(data?.locked_accounts ?? "—") },
              { label: "App Version", value: String(data?.app_version ?? "—") },
            ]}
          />
        </>
      )}

      <SectionCard title="Model registry" description="Deployed model artifacts and versions">
        {Object.keys(models).length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(models).map(([key, val]) => (
              <div
                key={key}
                className="rounded-lg border border-border/70 bg-muted/15 p-4 shadow-elevation-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{humanizeKey(key)}</p>
                  <Badge variant="outline" className="text-[10px]">
                    model
                  </Badge>
                </div>
                {typeof val === "object" && val !== null ? (
                  <dl className="space-y-1 text-xs">
                    {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">{humanizeKey(k)}</dt>
                        <dd className="max-w-[60%] truncate font-mono tabular-nums">{String(v ?? "—")}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="font-mono text-sm">{String(val ?? "—")}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No model versions reported.</p>
        )}
      </SectionCard>
    </PageContainer>
  );
}
