"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function DigitalTwinPage() {
  const layers = [
    { version: "V1", title: "Current production", desc: "This website — Phase 19 prediction + Phase 20.2 optimizer" },
    { version: "V2", title: "Planning + SCADA/MES", desc: "Delay codes, power-on/off, restriction flags integrated" },
    { version: "V3", title: "Real-time residual TTT", desc: "Live twin with delay early warning during heat" },
    { version: "V4", title: "Closed-loop optimization", desc: "EMS-constrained recipe recommendation with operator confirm" },
  ];

  return (
    <ResearchArticle title={RESEARCH_PAGES.digitalTwin.title} bullets={RESEARCH_PAGES.digitalTwin.bullets}>
      <SectionCard title="Architecture layers" className="mt-4">
        <div className="space-y-3">
          {layers.map((layer) => (
            <div key={layer.version} className="flex gap-4 rounded-lg border border-border/60 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                {layer.version}
              </div>
              <div>
                <p className="font-medium">{layer.title}</p>
                <p className="text-sm text-muted-foreground">{layer.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </ResearchArticle>
  );
}
