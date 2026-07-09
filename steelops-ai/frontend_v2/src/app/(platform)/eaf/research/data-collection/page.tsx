"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function DataCollectionPage() {
  const tiers = [
    {
      tier: "P0 — Immediate",
      items: ["Delay codes", "Power-on time", "Power-off / crane waits", "Restriction flag", "DRI metallization"],
    },
    { tier: "P1 — Next", items: ["HM temperature", "O₂/C injection profiles", "Transformer tap", "Arc V/I"] },
    { tier: "P2 — Later", items: ["Slag chemistry", "Foam index", "Alarm/maintenance historian links"] },
  ];

  return (
    <ResearchArticle title={RESEARCH_PAGES.dataCollection.title} bullets={RESEARCH_PAGES.dataCollection.bullets}>
      <SectionCard title="Priority sensor matrix" className="mt-4">
        <div className="grid gap-4 md:grid-cols-3">
          {tiers.map((block) => (
            <div key={block.tier} className="rounded-lg border border-border/60 bg-muted/10 p-4">
              <p className="font-medium">{block.tier}</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{item.replace(/^Immediate: /, "")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Expected information gain" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Phase 27 analysis ranked delay event codes and power-on/off timestamps as the highest expected information
          gain for breaking the ~3 min MAE ceiling. Sub-2.5 min normal-heat MAE is plausible only after P0 sensors
          are validated and shadow-deployed against the current production model.
        </p>
      </SectionCard>
    </ResearchArticle>
  );
}
