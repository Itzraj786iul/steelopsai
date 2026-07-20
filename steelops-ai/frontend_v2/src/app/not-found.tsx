import Link from "next/link";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { ActionButton } from "@/components/data-display/action-button";

export default function NotFoundPage() {
  return (
    <PageContainer className="py-16">
      <EmptyState
        title="Page not found"
        description="The page you requested does not exist in JSPL EAF TTT."
        actionLabel="Go to Dashboard"
      />
      <div className="mt-6 flex justify-center">
        <ActionButton asChild>
          <Link href="/eaf/prediction">Open Prediction</Link>
        </ActionButton>
      </div>
    </PageContainer>
  );
}
