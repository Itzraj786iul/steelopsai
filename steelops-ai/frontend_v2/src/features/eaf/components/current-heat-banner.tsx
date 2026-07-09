"use client";

import Link from "next/link";
import { AlertCircle, ChevronRight } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GoToPredictionLink, LoadDifferentHeatLink, NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { currentCharge, formatHeatAge, useCurrentHeatStore } from "@/stores/current-heat-store";

interface CurrentHeatBannerProps {
  sticky?: boolean;
  showActions?: boolean;
}

export function CurrentHeatBanner({ sticky = true, showActions = true }: CurrentHeatBannerProps) {
  const active = useCurrentHeatStore((s) => s.active);
  const recipeDirty = useCurrentHeatStore((s) => s.recipeDirty);
  const setDrawerOpen = useCurrentHeatStore((s) => s.setDrawerOpen);
  const clearHeat = useCurrentHeatStore((s) => s.clearHeat);

  if (!active?.prediction) {
    return (
      <SectionCard
        title="Current Heat"
        className={sticky ? "sticky top-[calc(var(--header-height,3.5rem)+0.5rem)] z-10 border-dashed" : undefined}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>No active heat. Go to Prediction to enter a recipe.</span>
          </div>
          <GoToPredictionLink />
        </div>
      </SectionCard>
    );
  }

  const charge = currentCharge(active.recipe);

  return (
    <SectionCard
      title="Current Heat Loaded"
      className={sticky ? "sticky top-[calc(var(--header-height,3.5rem)+0.5rem)] z-10 border-primary/20 bg-primary/5" : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default" className="bg-green-600">
              Active
            </Badge>
            {active.heatNumber ? (
              <span className="font-semibold">Heat {active.heatNumber}</span>
            ) : (
              <span className="text-muted-foreground">Heat —</span>
            )}
            <span className="text-sm text-muted-foreground">Shift {active.shift}</span>
            <span className="text-sm text-muted-foreground">Updated {formatHeatAge(active.lastUpdated)}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Prediction</p>
              <p className="font-mono text-xl font-bold text-primary">
                {active.prediction.predicted_ttt.toFixed(2)} min
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Confidence</p>
              <p className="text-lg font-semibold">{active.confidence ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Charge</p>
              <p className="font-mono text-lg">{charge.toFixed(1)} t</p>
            </div>
          </div>
          {recipeDirty ? (
            <p className="text-sm text-amber-600 dark:text-amber-400">Recipe changed — re-run Predict to refresh results.</p>
          ) : null}
        </div>
        {showActions ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(true)}>
              Details
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <LoadDifferentHeatLink />
            <Button variant="ghost" size="sm" onClick={clearHeat}>
              Clear Heat
            </Button>
            <NewHeatButton />
          </div>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/eaf/prediction">Predict</Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/eaf/optimizer">Optimize</Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/eaf/whatif">What-if</Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link href="/eaf/reports">Report</Link>
        </Button>
      </div>
    </SectionCard>
  );
}
