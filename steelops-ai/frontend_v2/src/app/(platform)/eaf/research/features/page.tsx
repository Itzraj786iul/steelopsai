"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function FeaturesPage() {
  return (
    <ResearchArticle title={RESEARCH_PAGES.features.title} bullets={RESEARCH_PAGES.features.bullets}>
      <SectionCard title="Gold feature tier (Phase 26)" className="mt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {["LOG_OXYGEN", "LOG_SOLID_BURDEN", "SCRAP_CARBON_OXYGEN"].map((feat) => (
            <div key={feat} className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="font-mono text-sm font-medium">{feat}</p>
              <p className="mt-1 text-xs text-muted-foreground">Robust across temporal splits</p>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Information ceiling" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Phase 26 evaluated 35 physically motivated candidates. Best combined model improved MAE by only ≈ 0.04 min
          versus Phase 25 — confirming that further gains require new plant measurements (delay codes, power-on/off,
          metallization) rather than additional derived features from existing columns.
        </p>
      </SectionCard>
    </ResearchArticle>
  );
}
