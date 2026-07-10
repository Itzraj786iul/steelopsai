"use client";

import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  History,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeatLifecycleTimeline } from "@/features/eaf/components/heat-lifecycle-timeline";
import { EmptyHeatState } from "@/features/eaf/components/empty-heat-state";
import { INDUSTRIAL_STATUS, confidenceStatus, acceptanceStatus } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import {
  currentCharge,
  formatHeatAge,
  useCurrentHeatStore,
} from "@/stores/current-heat-store";

function PanelContent({ compact = false }: { compact?: boolean }) {
  const active = useCurrentHeatStore((s) => s.active);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);
  const recipeDirty = useCurrentHeatStore((s) => s.recipeDirty);
  const loadHeat = useCurrentHeatStore((s) => s.loadHeat);

  if (!active?.prediction) {
    return <EmptyHeatState variant="panel" />;
  }

  const charge = currentCharge(active.recipe);
  const similarity =
    active.prediction.explainability?.historical_similarity_pct ??
    active.prediction.explainability?.similar_heats?.[0]?.similarity_pct ??
    null;
  const confKey = confidenceStatus(active.confidence);
  const warnings = active.warnings.length ? active.warnings : null;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Heat Status</p>
        <div className="mt-2 space-y-2 text-sm">
          <Row label="Heat No." value={active.heatNumber || "—"} mono />
          <Row label="Shift" value={active.shift} />
          <Row label="Current Charge" value={`${charge.toFixed(1)} t`} mono />
          <Row
            label="Predicted TTT"
            value={`${active.prediction.predicted_ttt.toFixed(2)} min`}
            mono
            highlight="prediction"
          />
          <Row label="Confidence" value={active.confidence ?? "—"} highlight={confKey} />
          <Row
            label="Historical Similarity"
            value={similarity != null ? `${similarity.toFixed(0)}%` : "—"}
          />
          <Row
            label="Warnings"
            value={warnings ? warnings.join("; ") : "None"}
            highlight={warnings ? "warning" : undefined}
          />
        </div>
        {recipeDirty ? (
          <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Recipe changed — re-run Predict
          </p>
        ) : null}
        {active.recommendationAcceptance ? (
          <Badge className={cn("mt-2", INDUSTRIAL_STATUS[acceptanceStatus(active.recommendationAcceptance)].className)}>
            {active.recommendationAcceptance}
          </Badge>
        ) : null}
      </div>

      {!compact ? <HeatLifecycleTimeline active={active} compact /> : null}

      <div className="border-t pt-3">
        <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <History className="h-3 w-3" />
          Session History
        </p>
        {!sessionHistory.length ? (
          <p className="text-xs text-muted-foreground">Last 20 heats appear after prediction.</p>
        ) : (
          <ScrollArea className="max-h-32">
            <div className="space-y-1">
              {sessionHistory.slice(0, 5).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => loadHeat(h.id)}
                  className="w-full rounded border border-border/50 p-2 text-left text-xs hover:bg-muted/50"
                >
                  <span className="font-medium">{h.heatNumber || "Heat"}</span>
                  <span className="ml-2 font-mono text-primary">
                    {h.prediction?.predicted_ttt.toFixed(1) ?? "—"} min
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground">Updated {formatHeatAge(active.lastUpdated)}</p>
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: ReturnType<typeof confidenceStatus> | "prediction" | "validated" | "warning";
}) {
  const colorClass =
    highlight === "prediction"
      ? "text-blue-700 dark:text-blue-400"
      : highlight === "validated"
        ? "text-emerald-700 dark:text-emerald-400"
        : highlight === "warning"
          ? "text-amber-700 dark:text-amber-400"
          : undefined;

  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-right font-medium", mono && "font-mono", colorClass)}>{value}</span>
    </div>
  );
}

export function StickyCurrentHeatPanelDesktop() {
  const pathname = usePathname();
  const panelCollapsed = useCurrentHeatStore((s) => s.panelCollapsed);
  const setPanelCollapsed = useCurrentHeatStore((s) => s.setPanelCollapsed);

  if (!pathname.startsWith("/eaf")) return null;

  return (
    <>
      {/* Tablet: collapsed strip */}
      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 overflow-hidden border-l border-border bg-background/95 md:flex lg:hidden",
          panelCollapsed ? "w-12" : "w-72"
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="m-2 shrink-0"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            aria-label={panelCollapsed ? "Expand current heat panel" : "Collapse current heat panel"}
          >
            {panelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          {!panelCollapsed ? (
            <ScrollArea className="min-h-0 flex-1 px-3 pb-4">
              <PanelContent compact />
            </ScrollArea>
          ) : (
            <div className="flex flex-1 flex-col items-center gap-2 py-4">
              <Target className="h-4 w-4 text-blue-600" aria-label="Current Heat" />
            </div>
          )}
        </div>
      </aside>

      {/* Desktop: collapsible status panel (not a second navbar) */}
      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 overflow-hidden border-l border-border bg-muted/20 backdrop-blur lg:block",
          panelCollapsed ? "w-10" : "w-64"
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="m-2 shrink-0 self-end"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            aria-label={panelCollapsed ? "Show heat status panel" : "Hide heat status panel"}
          >
            {panelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          {!panelCollapsed ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
              <PanelContent />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center py-4">
              <Target className="h-4 w-4 text-blue-600" aria-label="Heat status" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/** Mobile bottom sheet trigger + sheet */
export function StickyCurrentHeatMobileBar() {
  const pathname = usePathname();
  const active = useCurrentHeatStore((s) => s.active);
  const mobileSheetOpen = useCurrentHeatStore((s) => s.mobileSheetOpen);
  const setMobileSheetOpen = useCurrentHeatStore((s) => s.setMobileSheetOpen);

  if (!pathname.startsWith("/eaf")) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[1100] border-t border-border bg-background/95 p-2 backdrop-blur md:hidden">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => setMobileSheetOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-blue-600" />
            Current Heat
          </span>
          {active?.prediction ? (
            <span className="font-mono text-sm text-primary">
              {active.prediction.predicted_ttt.toFixed(1)} min
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No active heat</span>
          )}
        </Button>
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Heat Status</SheetTitle>
          </SheetHeader>
          <div className="mt-4 pb-6">
            <PanelContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function EafContentPadding() {
  const pathname = usePathname();
  if (!pathname.startsWith("/eaf")) return null;
  return <div className="h-14 md:hidden" aria-hidden />;
}
