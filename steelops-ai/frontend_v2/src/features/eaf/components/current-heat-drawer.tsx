"use client";

import Link from "next/link";
import { History, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { currentCharge, formatHeatAge, useCurrentHeatStore } from "@/stores/current-heat-store";
import { APP_VERSION } from "@/lib/constants";

export function CurrentHeatPill() {
  const active = useCurrentHeatStore((s) => s.active);
  const setDrawerOpen = useCurrentHeatStore((s) => s.setDrawerOpen);

  if (!active?.prediction) {
    return (
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-dashed border-muted-foreground/40 px-3 py-1 text-xs text-muted-foreground hover:bg-muted/50 md:flex"
      >
        No active heat
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="hidden items-center gap-2 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs hover:bg-green-500/15 md:flex"
    >
      <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
      <span className="font-medium">Current Heat</span>
      {active.heatNumber ? <span>Heat {active.heatNumber}</span> : null}
      <span className="text-muted-foreground">Shift {active.shift}</span>
      <span className="font-mono font-semibold text-primary">{active.prediction.predicted_ttt.toFixed(2)} min</span>
    </button>
  );
}

export function CurrentHeatDrawer() {
  const open = useCurrentHeatStore((s) => s.drawerOpen);
  const setDrawerOpen = useCurrentHeatStore((s) => s.setDrawerOpen);
  const active = useCurrentHeatStore((s) => s.active);
  const sessionHistory = useCurrentHeatStore((s) => s.sessionHistory);
  const loadHeat = useCurrentHeatStore((s) => s.loadHeat);

  return (
    <Sheet open={open} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Current Heat Session</span>
            <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        {!active ? (
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            <p>No active heat session. Enter a recipe on the Prediction page and run Predict.</p>
            <Button asChild>
              <Link href="/eaf/prediction">Go to Prediction</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-6 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge>v{APP_VERSION}</Badge>
              {active.heatNumber ? <Badge variant="outline">Heat {active.heatNumber}</Badge> : null}
              <Badge variant="outline">Shift {active.shift}</Badge>
            </div>

            <section>
              <h3 className="mb-2 font-semibold">Current Recipe</h3>
              <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
                {(["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"] as const).map((k) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-border/40 py-1">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd>{Number(active.recipe[k]).toFixed(1)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 text-muted-foreground">Charge: {currentCharge(active.recipe).toFixed(1)} t</p>
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Prediction</h3>
              {active.prediction ? (
                <p className="font-mono text-2xl font-bold text-primary">{active.prediction.predicted_ttt.toFixed(2)} min</p>
              ) : (
                <p className="text-muted-foreground">Not predicted yet</p>
              )}
              {active.confidence ? <p>Confidence: {active.confidence}</p> : null}
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Optimizer</h3>
              {active.optimizer ? (
                <p>
                  {active.optimizer.current_ttt.toFixed(2)} → {active.optimizer.optimized_ttt.toFixed(2)} min
                  <span className="ml-2 text-green-600">−{active.optimizer.improvement_min.toFixed(2)} min</span>
                </p>
              ) : (
                <p className="text-muted-foreground">Not optimized yet</p>
              )}
            </section>

            <section>
              <h3 className="mb-2 font-semibold">Hybrid</h3>
              {active.hybrid ? (
                <p>
                  Reliability {active.hybrid.reliability_index.toFixed(1)} / 100 · {active.hybrid.consensus}
                </p>
              ) : (
                <p className="text-muted-foreground">Run Predict to evaluate hybrid trust</p>
              )}
            </section>

            {active.warnings.length ? (
              <section>
                <h3 className="mb-2 font-semibold">Warnings</h3>
                <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                  {active.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 font-semibold">Validation</h3>
              {active.validation ? (
                <p className="text-muted-foreground">
                  Actual TTT: {active.validation.actualTtt ?? "Pending"}
                  {active.validation.operatorComments ? ` — ${active.validation.operatorComments}` : ""}
                </p>
              ) : (
                <p className="text-muted-foreground">No validation recorded for this session</p>
              )}
              <Button variant="link" className="h-auto p-0" asChild>
                <Link href="/eaf/validation">Open Validation</Link>
              </Button>
            </section>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/eaf/reports">Export</Link>
              </Button>
              <NewHeatButton />
            </div>

            <p className="text-xs text-muted-foreground">Last updated: {formatHeatAge(active.lastUpdated)}</p>
          </div>
        )}

        <section className="mt-8 border-t pt-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold">
            <History className="h-4 w-4" />
            Session History
          </h3>
          {!sessionHistory.length ? (
            <p className="text-sm text-muted-foreground">Last 20 heats appear here after prediction.</p>
          ) : (
            <div className="space-y-2">
              {sessionHistory.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => loadHeat(h.id)}
                  className="w-full rounded-lg border border-border/60 p-3 text-left hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{h.heatNumber ? `Heat ${h.heatNumber}` : "Session"}</span>
                    <span className="text-xs text-muted-foreground">Shift {h.shift}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span className="font-mono text-primary">
                      {h.prediction?.predicted_ttt.toFixed(2) ?? "—"} min
                    </span>
                    <span>{h.lastUpdated ? new Date(h.lastUpdated).toLocaleDateString() : ""}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </SheetContent>
    </Sheet>
  );
}
