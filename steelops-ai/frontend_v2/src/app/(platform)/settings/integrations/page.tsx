import { DashboardLayout } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { IntegrationCenter } from "@/features/onboarding/components/integration-center";

export default function Page() {
  return (
    <DashboardLayout>
      <PageHeader title="Integrations" description="Connect SAP, MES, SCADA, and plant systems" />
      <IntegrationCenter />
    </DashboardLayout>
  );
}
