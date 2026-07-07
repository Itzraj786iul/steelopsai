"use client";

import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { DecisionPackagePageView } from "@/features/preheat/components/preheat-analysis-view";

export function DecisionPackagePage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Decision package"
        description="Full orchestrator output with trace, reasoning, and export."
      />
      <DecisionPackagePageView />
    </DashboardLayout>
  );
}
