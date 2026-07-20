import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { ActionButton } from "@/components/data-display/action-button";

export default function UnauthorizedPage() {
  return (
    <PageContainer title="Unauthorized" description="Your role does not have access to this area.">
      <SectionCard>
        <EmptyState
          title="Access restricted"
          description="Contact your plant administrator if you need additional permissions."
        />
        <div className="mt-6 flex justify-center">
          <ActionButton asChild>
            <Link href="/eaf/prediction">Return to Prediction</Link>
          </ActionButton>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
