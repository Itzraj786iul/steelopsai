"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { PageContainer } from "@/components/layout/page-container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <PageContainer className="py-16">
          <ErrorState title="Application error" message={error.message} onRetry={reset} />
        </PageContainer>
      </body>
    </html>
  );
}
