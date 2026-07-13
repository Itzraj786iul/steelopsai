import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { ResearchTimeline } from "@/features/eaf/components/research-timeline";
import {
  APP_NAME,
  APP_VERSION,
  DATASET_VERSION,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";
import { ELECTRICAL_ENERGY_FULL_LABEL } from "@/lib/eaf-labels";

export function AboutView() {
  return (
    <PageContainer
      title="About"
      description="JSPL Electric Arc Furnace AI Decision Support Platform — production deployment with integrated research"
    >
      <SectionCard title="Project Objective">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {APP_NAME} helps JSPL Raigarh SMS-3 operators and engineers predict Electric Arc Furnace tap-to-tap time, evaluate
          heat recipes against historical plant practice, run physics-guided optimization, and export decision-support
          reports — while maintaining a clear separation between the deployed production model and experimental
          research pipelines (Phases 23–27).
        </p>
      </SectionCard>

      <SectionCard title="Industrial Problem" className="mt-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          EAF cycle time drives throughput, energy cost, and downstream scheduling. Operators plan burden, flux, oxygen,
          and electrical inputs before a heat starts, but retrospective variables such as {ELECTRICAL_ENERGY_FULL_LABEL}{" "}
          are only known after completion. The platform provides actionable TTT estimates and recipe comparisons while
          documenting where planning-time data gaps limit further accuracy gains.
        </p>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Dataset">
          <p className="text-sm text-muted-foreground">{DATASET_VERSION}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Normal heats (TTT ≤ 60 min) used for production model training. Research phases additionally studied delay
            heats and two-stage cohort separation.
          </p>
        </SectionCard>
        <SectionCard title="Current Production Version">
          <div className="flex flex-wrap gap-2">
            <Badge>{PRODUCTION_MODEL_PHASE} Model</Badge>
            <Badge variant="outline">{OPTIMIZER_PHASE} Optimizer</Badge>
            <Badge variant="outline">Website v{APP_VERSION}</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Frozen ensemble predictor (MAE ≈ 3.06 min) and physics-guided optimizer — no retraining in Phase 28.
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Machine Learning Pipeline" className="mt-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Industrial data cleaning & validation (Phase 13)</li>
          <li>Feature engineering — 22 production features (Phase 16)</li>
          <li>Feature selection with VIF control (Phases 17–18)</li>
          <li>Stacking Regressor — Optuna tuning (Phase 19, deployed)</li>
          <li>Physics-guided recipe optimizer (Phase 20.2, deployed)</li>
          <li>FastAPI + Next.js platform (Phases 22–22.5)</li>
          <li>Research: leakage audit, two-stage architecture, feature discovery (Phases 23–27)</li>
        </ol>
      </SectionCard>

      <SectionCard title="Recipe Optimization" className="mt-4">
        <p className="text-sm text-muted-foreground">
          The Phase 20.2 optimizer searches physics-compliant recipe adjustments using the frozen Phase 19 predictor.
          It inherits production feature semantics including Electrical Energy (kWh). Research recommends future
          optimizers use planning-stage variables once P0 sensors are validated.
        </p>
      </SectionCard>

      <SectionCard title="Leakage Study & Two-stage Architecture" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Phases 23–23.5 confirmed that {ELECTRICAL_ENERGY_FULL_LABEL} and derived energy interactions are retrospective.
          Phase 24–26 built leakage-free and two-stage experimental models (≈ 3.24–3.64 min on normal heats) that are
          not deployed. See the{" "}
          <Link href="/eaf/research" className="text-primary hover:underline">
            Research Center
          </Link>{" "}
          for full findings.
        </p>
      </SectionCard>

      <SectionCard title="Future Digital Twin" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Phase 27 defined a V1→V4 roadmap: current production website (V1), SCADA/MES integration (V2), real-time
          residual TTT (V3), and closed-loop optimization under EMS constraints (V4). Sub-2.5 min MAE requires P0
          delay codes, power-on/off, and metallization measurements.
        </p>
      </SectionCard>

      <SectionCard title="Technology Stack" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Python 3.10, FastAPI, scikit-learn, CatBoost, XGBoost, LightGBM, Optuna, Next.js 15, React 19, TypeScript,
          Tailwind CSS, Recharts, Zustand, Framer Motion, ReportLab
        </p>
      </SectionCard>

      <SectionCard title="Version History" className="mt-4">
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-mono font-medium">{APP_VERSION}</span>
            <span className="text-muted-foreground">
              {" "}
              — Phase 28: research integration, Electrical Energy relabeling, validation UX, Research Center
            </span>
          </li>
          <li>
            <span className="font-mono font-medium">2.5.0</span>
            <span className="text-muted-foreground"> — Phase 22.5 product unification</span>
          </li>
          <li>
            <span className="font-mono font-medium">2.0.0-rc</span>
            <span className="text-muted-foreground"> — Phase 22 FastAPI + Next.js deployment</span>
          </li>
          <li>
            <span className="font-mono font-medium">1.0.0</span>
            <span className="text-muted-foreground"> — Phase 21 Streamlit prototype (research only)</span>
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">Research track: {RESEARCH_VERSION}</p>
        <p className="mt-4 text-sm">
          <Link href="/eaf/settings" className="text-primary hover:underline">
            View platform settings
          </Link>
        </p>
      </SectionCard>

      <SectionCard title="Roadmap preview" className="mt-4">
        <ResearchTimeline compact />
      </SectionCard>
    </PageContainer>
  );
}
