import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

export function AboutView() {
  return (
    <PageContainer
      title="About"
      description="JSPL Electric Arc Furnace AI Decision Support Platform — internship research project"
    >
      <SectionCard title="Project Overview">
        <p className="text-sm leading-relaxed text-muted-foreground">
          {APP_NAME} is an industrial decision-support platform for Electric Arc Furnace (EAF) tap-to-tap time
          prediction and physics-guided recipe optimization. It combines a frozen ensemble ML model with process
          knowledge constraints to help operators and engineers evaluate heat recipes, estimate cycle time, and
          identify optimization opportunities at JSPL Angul.
        </p>
      </SectionCard>

      <SectionCard title="Architecture" className="mt-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Next.js 15 frontend on Vercel — unified enterprise UI for all EAF workflows</li>
          <li>FastAPI backend on Render — serves frozen ML artifacts without retraining</li>
          <li>Research pipeline (Phases 13–22) — data validation, feature engineering, model development, optimizer</li>
          <li>Guest authentication mode for production demo when SteelOps API is not deployed</li>
        </ol>
      </SectionCard>

      <SectionCard title="Technology Stack" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Python 3.10, FastAPI, scikit-learn, CatBoost, XGBoost, LightGBM, Optuna, Next.js 15, React 19,
          TypeScript, Tailwind CSS, Recharts, Zustand, TanStack Query, Framer Motion, ReportLab
        </p>
      </SectionCard>

      <SectionCard title="ML Pipeline" className="mt-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Data cleaning &amp; industrial validation (Phase 13)</li>
          <li>Feature engineering — 22 production features (Phase 16)</li>
          <li>Feature selection with VIF control (Phases 17–18)</li>
          <li>Stacking Regressor — Optuna tuning (Phase 19)</li>
          <li>Physics-guided recipe optimizer (Phase 20.2)</li>
          <li>FastAPI + Next.js platform integration (Phase 22)</li>
          <li>Complete product unification (Phase 22.5)</li>
        </ol>
      </SectionCard>

      <SectionCard title="Industrial Workflow" className="mt-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Operators enter heat recipe inputs (HM, DRI, power, oxygen, fluxes, shift). The platform predicts
          tap-to-tap time with confidence intervals and SHAP attribution, compares against historical operating
          bands, evaluates process health gauges, runs physics-compliant optimization, and exports decision
          reports for shift handover and engineering review.
        </p>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Author">
          <p className="text-sm text-muted-foreground">
            Developed as part of the JSPL internship research program. Enterprise UI unified for the EAF
            tap-to-tap decision support product.
          </p>
        </SectionCard>
        <SectionCard title="Internship Project">
          <p className="text-sm text-muted-foreground">
            Industrial ML research internship — bridging data science, metallurgical process knowledge, and
            production deployment for steel plant decision support.
          </p>
        </SectionCard>
      </div>

      <SectionCard title="Version History" className="mt-4">
        <ul className="space-y-2 text-sm">
          <li>
            <span className="font-mono font-medium">{APP_VERSION}</span>
            <span className="text-muted-foreground"> — Phase 22.5 product unification, EAF-only navigation</span>
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
        <p className="mt-4 text-sm">
          <Link href="/eaf/settings" className="text-primary hover:underline">
            View platform settings
          </Link>
        </p>
      </SectionCard>
    </PageContainer>
  );
}
