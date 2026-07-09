"use client";

import { RESEARCH_PHASES } from "@/lib/research-content";
import { cn } from "@/lib/utils";

interface ResearchTimelineProps {
  className?: string;
  compact?: boolean;
}

export function ResearchTimeline({ className, compact }: ResearchTimelineProps) {
  const phases = [
    ...RESEARCH_PHASES,
    {
      id: "future",
      title: "Future — Digital Twin",
      contribution: "Real-time SCADA/MES integration and closed-loop optimization",
      accuracy: "Target sub-2.5 min with P0 sensors",
      finding: "Requires delay codes, power-on/off, metallization, and restriction instrumentation",
    },
  ];

  return (
    <div className={cn("relative space-y-0", className)}>
      {phases.map((phase, index) => (
        <div key={phase.id} className="relative flex gap-4 pb-8 last:pb-0">
          {index < phases.length - 1 ? (
            <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border" aria-hidden />
          ) : null}
          <div
            className={cn(
              "relative z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-2 border-primary bg-background",
              phase.id === "19" && "border-green-600 bg-green-600/10",
              phase.id === "future" && "border-dashed"
            )}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{phase.title}</p>
            {!compact ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">{phase.contribution}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-label">Accuracy:</span> {phase.accuracy}
                </p>
                <p className="mt-1 text-xs">
                  <span className="text-label">Finding:</span> {phase.finding}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">{phase.finding}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
