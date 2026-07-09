"use client";

import type { ReactNode } from "react";
import { AlertTriangle, FlaskConical } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";

interface ResearchArticleProps {
  title: string;
  description?: string;
  summary?: string;
  bullets?: readonly string[];
  children?: ReactNode;
}

export function ResearchArticle({ title, description, summary, bullets, children }: ResearchArticleProps) {
  return (
    <PageContainer title={title} description={description}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="gap-1">
          <FlaskConical className="h-3 w-3" />
          Research — not production
        </Badge>
      </div>

      {summary ? (
        <SectionCard title="Summary">
          <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        </SectionCard>
      ) : null}

      {bullets?.length ? (
        <SectionCard title="Key findings" className={summary ? "mt-4" : undefined}>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {bullets.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      {children}

      <SectionCard title="Production reminder" className="mt-4 border-amber-500/30 bg-amber-500/5">
        <p className="flex gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          Live predictions and optimization use the frozen Phase 19 / 20.2 stack. Research findings inform future
          upgrades but do not change deployed ML behavior.
        </p>
      </SectionCard>
    </PageContainer>
  );
}
