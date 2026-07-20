import { Suspense } from "react";

import { HeatQueueView } from "@/features/ops/views/heat-queue-view";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <HeatQueueView />
    </Suspense>
  );
}
