"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { RESEARCH_PAGES } from "@/lib/research-content";

export default function EvolutionPage() {
  return (
    <ResearchArticle title={RESEARCH_PAGES.evolution.title} bullets={RESEARCH_PAGES.evolution.bullets}>
      <SectionCard title="Accuracy trajectory" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2">Phase</th>
                <th>Normal-heat MAE</th>
                <th>Key insight</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/50">
                <td className="py-2 font-medium text-foreground">19 — Production</td>
                <td className="font-mono">≈ 3.06 min</td>
                <td>Deployed StackingRegressor on TTT ≤ 60 cohort</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 font-medium text-foreground">24 — Leakage-free</td>
                <td className="font-mono">≈ 25–36 min (mixed heats)</td>
                <td>Apparent collapse from cohort mismatch</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 font-medium text-foreground">24.5 — Validation</td>
                <td className="font-mono">≈ 3.27 min (normal only)</td>
                <td>Leakage-free model is sound on matched cohort</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 font-medium text-foreground">25 — Two-stage</td>
                <td className="font-mono">≈ 3.64 min normal</td>
                <td>Pipeline MAE ~16 vs ~36 single-model baseline</td>
              </tr>
              <tr>
                <td className="py-2 font-medium text-foreground">26 — Feature discovery</td>
                <td className="font-mono">≈ 3.24 min</td>
                <td>Δ ≈ −0.04 min — information ceiling on existing columns</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </ResearchArticle>
  );
}
