import { Suspense } from "react";

import { ReportsView } from "@/features/eaf/components/reports-view";

export default function EafReportsPage() {
  return (
    <Suspense fallback={null}>
      <ReportsView />
    </Suspense>
  );
}
