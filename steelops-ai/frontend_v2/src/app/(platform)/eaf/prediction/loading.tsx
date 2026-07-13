import { PageLoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { PageContainer } from "@/components/layout/page-container";

export default function PredictionLoading() {
  return (
    <PageContainer title="Prediction" description="Loading prediction workspace…">
      <PageLoadingSkeleton />
    </PageContainer>
  );
}
