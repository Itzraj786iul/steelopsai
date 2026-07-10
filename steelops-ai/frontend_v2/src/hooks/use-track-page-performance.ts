"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { usePerformanceStore } from "@/stores/performance-store";

/** Records client-side page transition timing for the performance dashboard. */
export function useTrackPagePerformance() {
  const pathname = usePathname();
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    const elapsed = performance.now() - startRef.current;
    usePerformanceStore.getState().record({ type: "page_load", ms: elapsed });
    startRef.current = performance.now();
  }, [pathname]);
}
