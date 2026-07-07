import { DashboardLayout } from "@/components/layout/page-header";
import { SettingsHub } from "@/features/onboarding/components/settings-hub";

export default function Page() {
  return (
    <DashboardLayout>
      <SettingsHub />
    </DashboardLayout>
  );
}
