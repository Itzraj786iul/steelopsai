"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function RoadmapPage() {
  return (
    <ResearchArticle title={RESEARCH_PAGES.roadmap.title} bullets={RESEARCH_PAGES.roadmap.bullets}>
      <SectionCard title="Implementation timeline" className="mt-4">
        <div className="space-y-4">
          {[
            { period: "0–12 months", items: ["P0 MES/SCADA tags", "Shadow-deploy research v2", "Delay code instrumentation"] },
            { period: "1–3 years", items: ["Quality lab integration", "Live digital twin", "Human-in-loop optimizer"] },
            { period: "3+ years", items: ["Closed-loop EMS-aware recipes", "Sub-2.5 min target with full sensor suite"] },
          ].map((block) => (
            <div key={block.period} className="rounded-lg border border-border/60 p-4">
              <p className="font-medium">{block.period}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
    </ResearchArticle>
  );
}
