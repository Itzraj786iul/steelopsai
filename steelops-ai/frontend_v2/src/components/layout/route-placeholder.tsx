import { DashboardLayout } from "@/components/layout/page-header";
import { PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";
import { EmptyState } from "@/components/feedback/empty-state";

interface RoutePlaceholderProps {
  title: string;
  description?: string;
}

export function RoutePlaceholder({ title, description }: RoutePlaceholderProps) {
  return (
    <DashboardLayout>
      <PageHeader title={title} description={description} />
      <SectionCard>
        <EmptyState
          title="Module shell ready"
          description="Navigation and layout are active. Feature content will ship in the next sprint."
        />
      </SectionCard>
    </DashboardLayout>
  );
}
