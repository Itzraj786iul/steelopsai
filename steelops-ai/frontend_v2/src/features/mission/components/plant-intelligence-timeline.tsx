"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { BookOpen, TrendingUp, TrendingDown, Sparkles } from "lucide-react";

import { VizPanel } from "@/components/industrial/primitives";

export interface IntelligenceEvent {
  id: string;
  heatLabel: string;
  worked: string;
  failed?: string;
  discovered?: string;
  confidenceDelta: string;
  kind: "success" | "lesson" | "discovery";
}

const DEMO_EVENTS: IntelligenceEvent[] = [
  {
    id: "1",
    heatLabel: "H-4510",
    worked: "Reduced DRI 1.2t — heat time −1.4 min",
    discovered: "Lower DRI improves GREEN on high-HM charges",
    confidenceDelta: "+3% SIFM confidence",
    kind: "success",
  },
  {
    id: "2",
    heatLabel: "H-4508",
    worked: "Early oxygen cut preserved phosphorus",
    failed: "Power spike at 18 min — delay +0.8 min",
    confidenceDelta: "F2 model recalibrated",
    kind: "lesson",
  },
  {
    id: "3",
    heatLabel: "H-4505",
    worked: "Copilot recipe followed end-to-end",
    discovered: "New boundary: lime trim saves 0.6 min without quality loss",
    confidenceDelta: "+5% recipe portfolio",
    kind: "discovery",
  },
];

export const PlantIntelligenceTimeline = memo(function PlantIntelligenceTimeline({
  events = DEMO_EVENTS,
}: {
  events?: IntelligenceEvent[];
}) {
  return (
    <VizPanel title="Plant intelligence timeline" description="Every completed heat teaches the plant">
      <div className="relative space-y-0 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
        {events.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className="relative pb-8 last:pb-0"
          >
            <span className="absolute -left-5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-card">
              {event.kind === "discovery" ? <Sparkles className="h-4 w-4 text-primary" /> : <BookOpen className="h-4 w-4" />}
            </span>
            <p className="font-mono text-sm font-semibold">{event.heatLabel}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-accent">
              <TrendingUp className="h-3 w-3" /> {event.worked}
            </p>
            {event.failed ? (
              <p className="mt-1 flex items-center gap-1 text-sm text-warning">
                <TrendingDown className="h-3 w-3" /> {event.failed}
              </p>
            ) : null}
            {event.discovered ? <p className="mt-2 text-sm text-muted-foreground">Discovered: {event.discovered}</p> : null}
            <p className="mt-1 text-xs text-primary">{event.confidenceDelta}</p>
          </motion.div>
        ))}
      </div>
    </VizPanel>
  );
});
