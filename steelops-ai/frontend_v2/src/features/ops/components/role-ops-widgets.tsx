"use client";

import Link from "next/link";

import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { normalizeRole } from "@/lib/rbac/permissions";
import { UserRole } from "@/lib/enums";
import { useOpsContextStore } from "@/stores/ops-context-store";

/** Shortcuts use canonical routes only (no redirect orphans / Operator-blocked pages). */
const ROLE_WIDGETS: Record<string, { title: string; href: string; kpi: string }[]> = {
  [UserRole.Operator]: [
    { title: "Predict heat", href: "/eaf/prediction", kpi: "Primary" },
    { title: "Optimizer", href: "/eaf/optimizer", kpi: "Decision" },
    { title: "Heat History", href: "/eaf/heat-history", kpi: "Records" },
    { title: "Reports", href: "/eaf/reports", kpi: "Export" },
  ],
  [UserRole.ShiftEngineer]: [
    { title: "Shift handover", href: "/eaf/shift-handover", kpi: "Handover" },
    { title: "Approvals", href: "/eaf/approvals", kpi: "Workflow" },
    { title: "Shift dashboard", href: "/eaf/shift-dashboard", kpi: "Shift" },
    { title: "Delays", href: "/eaf/delays", kpi: "Downtime" },
  ],
  [UserRole.ProductionManager]: [
    { title: "Live Board", href: "/eaf/live-board", kpi: "Floor" },
    { title: "Heat queue", href: "/eaf/heat-queue", kpi: "Queue" },
    { title: "Approvals", href: "/eaf/approvals", kpi: "Backlog" },
    { title: "Run heat path", href: "/eaf/prediction", kpi: "Heat" },
  ],
  [UserRole.PlantManager]: [
    { title: "Live Board", href: "/eaf/live-board", kpi: "Floor" },
    { title: "Production Plan", href: "/eaf/production-plan", kpi: "Plan" },
    { title: "Shift Analytics", href: "/eaf/shift-dashboard", kpi: "Trends" },
    { title: "Announcements", href: "/eaf/announcements", kpi: "Comms" },
  ],
  [UserRole.Admin]: [
    { title: "Users", href: "/eaf/users", kpi: "RBAC" },
    { title: "Audit log", href: "/eaf/audit-log", kpi: "Compliance" },
    { title: "Furnaces", href: "/eaf/furnaces", kpi: "Assets" },
    { title: "Settings", href: "/eaf/settings", kpi: "Plant" },
  ],
};

/** Role-customized shortcuts / KPIs for the main dashboard. */
export function RoleOpsWidgets() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || "operator");
  const furnaceId = useOpsContextStore((s) => s.furnaceId);
  const widgets = ROLE_WIDGETS[role] || ROLE_WIDGETS[UserRole.Operator];

  return (
    <SectionCard title="Operations shortcuts" description={`Role: ${role} · Furnace: ${furnaceId}`}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {widgets.map((w) => (
          <Button key={w.href} asChild variant="outline" className="h-auto flex-col items-start gap-1 py-3">
            <Link href={w.href}>
              <span className="text-xs text-muted-foreground">{w.kpi}</span>
              <span className="font-medium">{w.title}</span>
            </Link>
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}
