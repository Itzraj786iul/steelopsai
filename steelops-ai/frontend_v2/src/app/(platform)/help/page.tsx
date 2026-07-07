import { DashboardLayout } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { HelpCenter } from "@/features/onboarding/components/help-center";

export default function Page() {
  return (
    <DashboardLayout>
      <PageHeader title="Help center" description="Documentation, FAQ, shortcuts, and support" />
      <HelpCenter />
    </DashboardLayout>
  );
}
