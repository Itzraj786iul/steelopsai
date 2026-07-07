"use client";

import { DashboardLayout } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";

interface SettingsSectionProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <DashboardLayout>
      <PageHeader title={title} description={description} />
      <SectionCard>{children ?? <p className="text-sm text-muted-foreground">Configuration options for this section.</p>}</SectionCard>
    </DashboardLayout>
  );
}
