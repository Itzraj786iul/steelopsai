"use client";

import { ResearchArticle } from "@/features/eaf/components/research-article";
import { ResearchTimeline } from "@/features/eaf/components/research-timeline";
import { SectionCard } from "@/components/layout/section-card";

export default function TimelinePage() {
  return (
    <ResearchArticle
      title="Model Timeline"
      description="Major research and production milestones from Phase 16 through the digital twin roadmap"
    >
      <SectionCard title="Phase progression">
        <ResearchTimeline />
      </SectionCard>
    </ResearchArticle>
  );
}
