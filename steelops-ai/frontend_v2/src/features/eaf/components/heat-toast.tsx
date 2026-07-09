"use client";

import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { cn } from "@/lib/utils";

export function HeatToast() {
  const toast = useCurrentHeatStore((s) => s.toast);
  const clearToast = useCurrentHeatStore((s) => s.clearToast);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-20 right-4 z-[1600] max-w-sm rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800 shadow-lg",
        "animate-in fade-in slide-in-from-bottom-2 dark:text-green-200"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span>{toast}</span>
        <button type="button" className="text-muted-foreground hover:text-foreground" onClick={clearToast} aria-label="Dismiss">
          ×
        </button>
      </div>
    </div>
  );
}
