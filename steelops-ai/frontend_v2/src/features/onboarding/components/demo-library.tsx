"use client";

import { Play } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Badge } from "@/components/ui/badge";
import { DEMO_SCENARIOS } from "@/features/onboarding/utils/demo-scenarios";
import { useDemoStore } from "@/stores/demo-store";

export function DemoLibrary() {
  const startDemo = useDemoStore((s) => s.startDemo);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {DEMO_SCENARIOS.map((scenario) => (
        <article
          key={scenario.id}
          className="flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-elevation-md"
        >
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{scenario.tag}</Badge>
            <span className="font-mono text-xs text-muted-foreground">{scenario.heatCount} heats</span>
          </div>
          <h3 className="mt-3 text-heading-sm">{scenario.title}</h3>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">{scenario.description}</p>
          <ActionButton className="mt-4 w-full" variant="outline" onClick={() => startDemo(scenario.id)}>
            <Play className="h-4 w-4" />
            Launch scenario
          </ActionButton>
        </article>
      ))}
    </div>
  );
}
