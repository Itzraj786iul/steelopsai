"use client";

import { Suspense } from "react";

import { HeatHistoryView } from "@/features/eaf/components/heat-history-view";

export default function HeatHistoryPage() {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading heat history…</p>}>
      <HeatHistoryView />
    </Suspense>
  );
}
