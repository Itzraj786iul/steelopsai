"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { ExecutiveNarrative as ExecutiveNarrativeData, StoryPanel } from "@/features/executive/utils/executive-metrics";

export const ExecutiveStoryPanels = memo(function ExecutiveStoryPanels({ panels }: { panels: StoryPanel[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {panels.map((panel, i) => (
        <motion.article
          key={panel.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex flex-col items-center rounded-2xl border border-border/60 bg-card/70 px-6 py-8 text-center"
        >
          <p className="text-label">{panel.headline}</p>
          {panel.amount ? <p className="mt-2 font-mono text-4xl font-bold text-accent">{panel.amount}</p> : null}
          <p className="mt-1 text-sm text-muted-foreground">today</p>
          <ChevronDown className="my-3 h-5 w-5 text-muted-foreground/40" aria-hidden />
          <p className="max-w-sm text-sm leading-relaxed text-foreground/90">{panel.equivalent}</p>
        </motion.article>
      ))}
    </div>
  );
});

export const ExecutiveNarrative = memo(function ExecutiveNarrative({ narrative }: { narrative: ExecutiveNarrativeData }) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
      <p className="text-label">Executive narrative</p>
      <h2 className="mt-1 text-heading-lg">{narrative.headline}</h2>
      <ul className="mt-4 space-y-3">
        {narrative.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3 text-sm leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {bullet}
          </li>
        ))}
      </ul>
    </section>
  );
});
