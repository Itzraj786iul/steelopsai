"use client";

import { Pause, Play, X } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { useDemoStore } from "@/stores/demo-store";

export function DemoBanner() {
  const { active, playing, getCurrentEvent, getScenario, pauseDemo, resumeDemo, stopDemo } = useDemoStore();

  if (!active) return null;

  const event = getCurrentEvent();
  const scenario = getScenario();

  return (
    <div className="sticky top-0 z-[1300] flex items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-2 text-sm backdrop-blur">
      <span className="font-medium text-primary">Demo: {scenario?.title}</span>
      <span className="hidden truncate text-muted-foreground sm:inline">{event?.phase}</span>
      <div className="ml-auto flex gap-1">
        {playing ? (
          <ActionButton variant="ghost" size="sm" onClick={pauseDemo}>
            <Pause className="h-3 w-3" />
          </ActionButton>
        ) : (
          <ActionButton variant="ghost" size="sm" onClick={resumeDemo}>
            <Play className="h-3 w-3" />
          </ActionButton>
        )}
        <ActionButton variant="ghost" size="sm" onClick={stopDemo}>
          <X className="h-3 w-3" />
          Exit demo
        </ActionButton>
      </div>
    </div>
  );
}
