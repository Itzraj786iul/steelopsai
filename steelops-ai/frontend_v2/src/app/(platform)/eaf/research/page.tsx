"use client";

import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { ResearchArticle } from "@/features/eaf/components/research-article";
import { ResearchTimeline } from "@/features/eaf/components/research-timeline";
import { RESEARCH_PAGES } from "@/lib/research-content";

const RESEARCH_LINKS = [
  { href: "/eaf/research/leakage", title: "Leakage Analysis", desc: "Electrical Energy retrospective audit" },
  { href: "/eaf/research/evolution", title: "Model Evolution", desc: "Phase 19 through Phase 26 trajectory" },
  { href: "/eaf/research/two-stage", title: "Two-stage Architecture", desc: "Classifier + leakage-free regression" },
  { href: "/eaf/research/features", title: "Feature Discovery", desc: "35 metallurgical candidates" },
  { href: "/eaf/research/roadmap", title: "Industrial Roadmap", desc: "MES/SCADA and AI roadmap" },
  { href: "/eaf/research/digital-twin", title: "Digital Twin", desc: "V1–V4 architecture layers" },
  { href: "/eaf/research/data-collection", title: "Future Data Collection", desc: "P0 sensor priorities" },
  { href: "/eaf/research/comparison", title: "Production vs Research", desc: "Deployed vs experimental" },
  { href: "/eaf/research/timeline", title: "Model Timeline", desc: "Phase 16 → Digital Twin" },
];

export default function ResearchOverviewPage() {
  return (
    <ResearchArticle
      title="Research Overview"
      description="Findings from Phases 23–27 — presentation only, production ML frozen"
      summary={RESEARCH_PAGES.overview.summary}
    >
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {RESEARCH_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex items-start justify-between gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-3 font-medium">{link.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{link.desc}</p>
          </Link>
        ))}
      </div>

      <SectionCard title="Research timeline preview" className="mt-6">
        <ResearchTimeline compact />
      </SectionCard>
    </ResearchArticle>
  );
}
