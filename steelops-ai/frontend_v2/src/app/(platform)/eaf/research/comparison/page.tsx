"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { PROD_VS_RESEARCH } from "@/lib/research-content";

export default function ComparisonPage() {
  return (
    <ResearchArticle
      title="Production vs Research"
      description="Clear separation between the deployed model and experimental pipelines"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>Production — deployed</Badge>
        <Badge variant="outline">Research — experimental</Badge>
      </div>
      <SectionCard title="Comparison matrix">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Dimension</th>
                <th className="pr-4">Production Model</th>
                <th>Research Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {PROD_VS_RESEARCH.map((row) => (
                <tr key={row.dimension} className="border-b border-border/50 align-top">
                  <td className="py-3 pr-4 font-medium">{row.dimension}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{row.production}</td>
                  <td className="py-3 text-muted-foreground">{row.research}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Operator guidance" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Use <strong className="text-foreground">Prediction</strong> and <strong className="text-foreground">Optimizer</strong>{" "}
          pages for live decisions — they call the frozen Phase 19 / 20.2 stack. Research Center pages are for engineering
          review and management briefings only.
        </p>
      </SectionCard>
    </ResearchArticle>
  );
}
