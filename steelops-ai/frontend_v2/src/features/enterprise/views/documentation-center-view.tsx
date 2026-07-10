"use client";

import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { PRODUCTION_MODEL_PHASE, OPTIMIZER_PHASE, APP_VERSION } from "@/lib/constants";
import { HYBRID_ENGINE_PHASE, RESEARCH_OPTIMIZER_PHASE } from "@/lib/enterprise-versions";

const DOCS = [
  {
    id: "manual",
    title: "User Manual",
    summary: "Operator workflow: enter burden composition, predict TTT, optimize, validate, and export reports.",
    sections: [
      "1. Create a heat on the Prediction page with heat number and shift.",
      "2. Review prediction confidence and historical similarity.",
      "3. Run the production optimizer (Phase 20.2) and accept or reject recommendations.",
      "4. Record actual TTT on Validation when the heat completes.",
      "5. Export session data from Reports or Session Backup.",
    ],
  },
  {
    id: "architecture",
    title: "System Architecture",
    summary: "Next.js frontend, FastAPI EAF backend, frozen Phase 19 model and Phase 20.2 optimizer.",
    sections: [
      "Frontend: Next.js 15 App Router with Zustand session store (localStorage).",
      "Backend: FastAPI service exposing /predict, /optimize, /hybrid/evaluate.",
      "ML: Phase 19 CatBoost model — pickles frozen, no retraining in production.",
      "Research bridge: Phase 31 V2 and Phase 32 hybrid via read-only API extensions.",
    ],
  },
  {
    id: "api",
    title: "API Reference",
    summary: "Key endpoints on the EAF backend (default port 8001).",
    sections: [
      "POST /predict — Phase 19 TTT prediction",
      "POST /optimize — Phase 20.2 recipe optimization",
      "POST /optimize/v2 — Phase 31 research optimizer",
      "POST /hybrid/evaluate — Phase 32 hybrid trust framework",
      "GET /health — service and model load status",
      "GET /validation — plant validation records (Phase 33)",
    ],
  },
  {
    id: "model",
    title: "Model Overview",
    summary: `${PRODUCTION_MODEL_PHASE} leakage-free CatBoost model trained on Phase 16 industrial cohort.`,
    sections: [
      "Target: Tap-to-Tap Time (TTT) in minutes.",
      "Features: burden composition, electrical energy, oxygen, shift indicators.",
      "Outputs: point prediction, 95% confidence interval, SHAP contributors.",
      "Frozen artifact — no online learning in v1.0.0.",
    ],
  },
  {
    id: "optimizer",
    title: "Optimizer Overview",
    summary: `${OPTIMIZER_PHASE} physics-guided recipe optimizer with historical band validation.`,
    sections: [
      "Minimizes predicted TTT while respecting charge balance and flux constraints.",
      "Never optimizes electrical energy (POWER) in production mode.",
      "Returns engineering explanations for each burden adjustment.",
      `Research optimizer ${RESEARCH_OPTIMIZER_PHASE} available separately.`,
    ],
  },
  {
    id: "timeline",
    title: "Research Timeline",
    summary: "Phases 19–37 development history.",
    sections: [
      "Phase 19: Production prediction model",
      "Phase 20.2: Production optimizer",
      "Phases 23–27: Scientific review, leakage audit, feature discovery",
      "Phase 31–32: Research optimizer and hybrid engine",
      "Phase 33: Industrial product integration",
      "Phases 34–37: UX, shift dashboard, enterprise readiness",
    ],
  },
  {
    id: "roadmap",
    title: "Future Roadmap",
    summary: "Planned industrial AI capabilities beyond v1.0.0.",
    sections: [
      "SCADA/MES live data integration",
      "Delay code and power-on-time sensors",
      "Full digital twin with real-time twinning",
      "Multi-furnace fleet analytics",
      `Hybrid engine ${HYBRID_ENGINE_PHASE} production gate review`,
    ],
  },
];

export function DocumentationCenterView() {
  return (
    <PageContainer title="Documentation" description={`SteelOps AI v${APP_VERSION} — in-application reference`}>
      <div className="grid gap-4 lg:grid-cols-2">
        {DOCS.map((doc) => (
          <SectionCard key={doc.id} title={doc.title} description={doc.summary}>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {doc.sections.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
      <SectionCard title="External Research" className="mt-6">
        <p className="text-sm text-muted-foreground">Detailed research deliverables remain in the repository under research/ and release/ folders.</p>
        <Button variant="outline" className="mt-3" asChild>
          <Link href="/eaf/research">Open Research Center</Link>
        </Button>
      </SectionCard>
    </PageContainer>
  );
}
