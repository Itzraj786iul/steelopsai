"use client";

import Link from "next/link";
import { FlaskConical, LineChart } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { ShiftOperationsDashboard } from "@/features/eaf/components/shift-operations-dashboard";
import { RoleOpsWidgets } from "@/features/ops/components/role-ops-widgets";
import { MesDashboardWidgets } from "@/features/mes/components/mes-dashboard-widgets";
import { useEafDashboard } from "@/features/eaf/hooks/use-eaf";
import {
  APP_VERSION,
  DATASET_VERSION,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";

export function EafDashboardView() {
  const { error, model } = useEafDashboard();

  return (
    <PageContainer
      title="Operations Dashboard"
      description="Shift-level monitoring — current heat and today's production"
    >
      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ShiftOperationsDashboard />

      <div className="mt-6">
        <MesDashboardWidgets />
      </div>

      <div className="mt-6">
        <RoleOpsWidgets />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SectionCard title="Production Model">
          <p className="font-semibold">{model?.model_name ?? PRODUCTION_MODEL_PHASE}</p>
          <p className="text-sm text-muted-foreground">Deployed production model</p>
        </SectionCard>
        <SectionCard title="Release">
          <p className="font-semibold">v{APP_VERSION}</p>
          <p className="text-sm text-muted-foreground">Optimizer {OPTIMIZER_PHASE}</p>
        </SectionCard>
        <SectionCard title="Research Artifacts">
          <p className="font-semibold">{RESEARCH_VERSION}</p>
          <p className="text-sm text-muted-foreground">Frozen — research navigation only</p>
        </SectionCard>
        <SectionCard title="Dataset">
          <Badge variant="outline">{DATASET_VERSION}</Badge>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Research Center">
          <p className="text-sm text-muted-foreground">Experimental tools — separated from production navigation.</p>
          <ActionButton className="mt-4" variant="outline" asChild>
            <Link href="/eaf/research">
              <FlaskConical className="mr-2 h-4 w-4" />
              Open Research Center
            </Link>
          </ActionButton>
        </SectionCard>
        <SectionCard title="Model Insights">
          <ActionButton variant="outline" asChild>
            <Link href="/eaf/model">
              <LineChart className="mr-2 h-4 w-4" />
              Open Model Insights
            </Link>
          </ActionButton>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
