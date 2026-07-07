import { DashboardLayout } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { TrainingCenter } from "@/features/onboarding/components/training-center";

export default function Page() {
  return (
    <DashboardLayout>
      <PageHeader title="Training" description="Role-based learning paths and certifications" />
      <TrainingCenter />
    </DashboardLayout>
  );
}
