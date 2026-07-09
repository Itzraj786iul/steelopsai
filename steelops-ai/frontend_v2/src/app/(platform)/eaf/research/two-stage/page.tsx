"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function TwoStagePage() {
  return (
    <ResearchArticle title={RESEARCH_PAGES.twoStage.title} bullets={RESEARCH_PAGES.twoStage.bullets}>
      <SectionCard title="Architecture flowchart" className="mt-4">
        <div className="flex flex-col items-stretch gap-2 font-mono text-sm sm:flex-row sm:items-center sm:justify-center">
          {["Recipe input", "Stage 1 classifier", "NORMAL → Stage 2 TTT", "ABNORMAL → Delay warning"].map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center">{step}</div>
              {i < 3 ? <span className="hidden text-muted-foreground sm:inline">→</span> : null}
            </div>
          ))}
        </div>
      </SectionCard>
    </ResearchArticle>
  );
}
