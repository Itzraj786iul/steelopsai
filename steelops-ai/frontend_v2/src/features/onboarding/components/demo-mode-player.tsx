"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Square, X } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useDemoStore } from "@/stores/demo-store";

export function DemoModePlayer() {
  const router = useRouter();
  const {
    active,
    playing,
    eventIndex,
    events,
    startDemo,
    stopDemo,
    pauseDemo,
    resumeDemo,
    advanceEvent,
    getCurrentEvent,
    getScenario,
  } = useDemoStore();

  const current = getCurrentEvent();
  const scenario = getScenario();
  const progress = events.length ? ((eventIndex + 1) / events.length) * 100 : 0;

  useEffect(() => {
    if (!active || !playing || !current) return;
    const timer = window.setTimeout(() => {
      if (current.href) router.push(current.href);
      advanceEvent();
    }, current.durationMs);
    return () => window.clearTimeout(timer);
  }, [active, playing, current, eventIndex, advanceEvent, router]);

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-8 text-center">
        <p className="text-label">Interactive demo</p>
        <h3 className="mt-2 text-heading-lg">Run a full production day</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          12 heats, AI predictions, operator approvals, live execution, digital twin, executive dashboard, and learning — all automated with seeded data.
        </p>
        <ActionButton className="mt-6" onClick={() => startDemo("full-day")}>
          <Play className="h-4 w-4" />
          Run interactive demo
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-elevation-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge>{scenario?.tag ?? "Demo"}</Badge>
          <h3 className="mt-2 text-heading-md">{current?.title ?? "Demo complete"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{current?.description}</p>
          {current?.metric ? (
            <p className="mt-2 font-mono text-lg text-accent">{current.metric}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {playing ? (
            <ActionButton variant="outline" size="sm" onClick={pauseDemo}>
              <Pause className="h-4 w-4" />
            </ActionButton>
          ) : (
            <ActionButton variant="outline" size="sm" onClick={resumeDemo} disabled={eventIndex >= events.length - 1}>
              <Play className="h-4 w-4" />
            </ActionButton>
          )}
          <ActionButton variant="outline" size="sm" onClick={() => advanceEvent()}>
            <Square className="h-4 w-4" />
            Skip
          </ActionButton>
          <ActionButton variant="ghost" size="sm" onClick={stopDemo}>
            <X className="h-4 w-4" />
          </ActionButton>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{current?.phase ?? "Complete"}</span>
          <span>
            {eventIndex + 1} / {events.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>
    </div>
  );
}
