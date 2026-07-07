import { EmptyState } from "@/components/feedback/empty-state";
import { DashboardLayout, PageHeader } from "@/components/layout/page-header";
import { SectionCard } from "@/components/layout/section-card";
import { ActionButton } from "@/components/data-display/action-button";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <DashboardLayout>
      <PageHeader title="Unauthorized" description="Your role does not have access to this area." />
      <SectionCard>
        <EmptyState
          title="Access restricted"
          description="Contact your plant administrator if you need additional permissions."
        />
        <div className="mt-6 flex justify-center">
          <ActionButton asChild>
            <Link href="/dashboard">Return to Today</Link>
          </ActionButton>
        </div>
      </SectionCard>
    </DashboardLayout>
  );
}
