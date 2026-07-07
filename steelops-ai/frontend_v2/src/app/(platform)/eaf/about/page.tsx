import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";

export default function EafAboutPage() {
  return (
    <PageContainer title="About Project" description="Research pipeline and deployment">
      <SectionCard title="Pipeline">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Data cleaning & industrial validation (Phase 13)</li>
          <li>Feature engineering — 22 production features (Phase 16)</li>
          <li>Feature selection with VIF control (Phases 17–18)</li>
          <li>Stacking Regressor development — Optuna tuning (Phase 19)</li>
          <li>Physics-guided recipe optimizer (Phase 20.2)</li>
          <li>FastAPI + Next.js platform integration (Phase 22)</li>
        </ol>
      </SectionCard>
      <SectionCard title="Technology Stack" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Python, FastAPI, scikit-learn, CatBoost, XGBoost, LightGBM, Next.js 15, React 19,
          Tailwind CSS, Recharts, Plotly (research), ReportLab
        </p>
      </SectionCard>
      <SectionCard title="Research Contribution" className="mt-4">
        <p className="text-sm text-muted-foreground">
          Hybrid ML + process-knowledge optimization for EAF tap-to-tap time. Combines frozen ensemble
          prediction with physics penalties, HM–DRI coupling, and historical similarity constraints.
        </p>
      </SectionCard>
    </PageContainer>
  );
}
