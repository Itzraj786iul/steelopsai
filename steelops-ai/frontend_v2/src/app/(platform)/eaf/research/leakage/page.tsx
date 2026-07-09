"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function LeakagePage() {
  return (
    <ResearchArticle title={RESEARCH_PAGES.leakage.title} bullets={RESEARCH_PAGES.leakage.bullets}>
      <SectionCard title="What operators should know" className="mt-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The field previously shown as &quot;POWER&quot; is <strong className="text-foreground">Electrical Energy Consumed (kWh)</strong>.
          It is available after the heat finishes and is correlated with how long the heat actually ran. The live
          production model still uses it because it was part of the historically trained Phase 19 artifact. Research
          recommends a planning-safe replacement once new plant measurements are available — until then, treat
          energy-driven explanations with caution for pre-heat recipe decisions.
        </p>
      </SectionCard>
    </ResearchArticle>
  );
}
