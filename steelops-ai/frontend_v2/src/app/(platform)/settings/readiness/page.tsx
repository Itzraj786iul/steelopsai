import { DashboardLayout } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { ReleaseReadinessDashboard } from "@/features/onboarding/components/release-readiness-dashboard";

export default function Page() {
  return (
    <DashboardLayout>
      <PageHeader title="Release readiness" description="Deployment health for pilot go-live" />
      <ReleaseReadinessDashboard />
    </DashboardLayout>
  );
}
