"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceRing } from "@/components/industrial/gauges";
import { FeatureImportanceChart } from "@/features/eaf/components/feature-importance-chart";
import { ShapInterpretations } from "@/features/eaf/components/shap-interpretations";
import { useEafModelInfo } from "@/features/eaf/hooks/use-eaf";
import { DEFAULT_RECIPE, eafApi, type PredictResponse } from "@/lib/api/eaf";
import { ELECTRICAL_ENERGY_FULL_LABEL, formatVariableLabel } from "@/lib/eaf-labels";
import { PRODUCTION_MODEL_PHASE } from "@/lib/constants";

export function ModelInsightsView() {
  const { info, loading: modelLoading } = useEafModelInfo();
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);

  useEffect(() => {
    eafApi.predict(DEFAULT_RECIPE).then(({ data }) => setPrediction(data)).catch(() => undefined);
  }, []);

  if (modelLoading && !info) {
    return (
      <PageContainer title="Model Insights" description="Loading production model metadata…">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Model Insights"
      description={`Frozen ${PRODUCTION_MODEL_PHASE} ensemble — SHAP attribution, leakage documentation, and industrial interpretation`}
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge>Production — deployed</Badge>
        <Badge variant="outline">MAE ≈ {info?.test_mae} min</Badge>
      </div>

      <SectionCard title="Electrical Energy (kWh) — important note" className="border-amber-500/30 bg-amber-500/5">
        <p className="flex gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            JSPL confirmed the field is <strong className="text-foreground">{ELECTRICAL_ENERGY_FULL_LABEL}</strong>,
            recorded after heat completion — not electrical power (MW). The production model uses it because it was
            available during historical training. Research (Phases 23–26) identified energy-derived features as
            retrospective for planning-time decisions. The production model remains unchanged until an industrially
            validated replacement is available. See{" "}
            <Link href="/eaf/research/leakage" className="text-primary hover:underline">
              Leakage Analysis
            </Link>
            .
          </span>
        </p>
      </SectionCard>

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Model">
          <p className="text-2xl font-semibold">{info?.model_name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{info?.dataset}</p>
        </SectionCard>
        <SectionCard title="Test MAE">
          <p className="font-mono text-3xl font-bold">{info?.test_mae} min</p>
        </SectionCard>
        <SectionCard title="Test R²">
          <p className="font-mono text-3xl font-bold">{info?.test_r2}</p>
        </SectionCard>
        <SectionCard title="Features">
          <p className="font-mono text-3xl font-bold">{info?.n_features}</p>
        </SectionCard>
        <SectionCard title="Optimizer">
          <p className="text-lg font-medium">{info?.optimizer_version}</p>
        </SectionCard>
        <SectionCard title="95% Confidence Interval">
          <p className="font-mono text-3xl font-bold">± {info?.ci_half_width_95} min</p>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FeatureImportanceChart contributors={prediction?.top_contributors ?? []} title="Production SHAP Summary" />
        <ShapInterpretations
          contributors={prediction?.explainability?.contributor_interpretations ?? prediction?.top_contributors ?? []}
          title="Metallurgical Interpretation"
        />
      </div>

      <SectionCard title="Why Electrical Energy appears in top features" className="mt-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>
            • <strong className="text-foreground">HM × Electrical Energy</strong> and{" "}
            <strong className="text-foreground">Electrical Energy / Tonne</strong> are among the strongest predictors
            because realized energy consumption correlates with how long the heat actually ran.
          </li>
          <li>• At planning time, operators do not yet know final kWh — this is a retrospective signal.</li>
          <li>• Research leakage-free models (Phase 24–26) achieve similar MAE (~3.24–3.64 min) without energy inputs on normal heats.</li>
          <li>• Future production upgrades require P0 sensors (delay codes, power-on/off) before replacing energy features.</li>
        </ul>
      </SectionCard>

      {prediction ? (
        <SectionCard title="Prediction Explanation" description="Interpretation for the reference heat recipe" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="font-mono text-4xl font-bold text-primary">{prediction.predicted_ttt.toFixed(2)} min</p>
              <p className="text-sm text-muted-foreground">
                95% interval: {prediction.ci_lower_95.toFixed(1)} – {prediction.ci_upper_95.toFixed(1)} min
                {prediction.ci_half_width != null ? ` (±${prediction.ci_half_width.toFixed(2)})` : ""}
              </p>
              {prediction.neighbor_calibrated_ttt != null ? (
                <p className="text-sm text-muted-foreground">
                  Neighbour-informed TTT:{" "}
                  <span className="font-mono text-foreground">{prediction.neighbor_calibrated_ttt.toFixed(2)} min</span>
                </p>
              ) : null}
              {prediction.explainability?.neighbor_benchmark ? (
                <p className="text-sm text-muted-foreground">
                  Similar-heat band:{" "}
                  <span className="font-mono text-foreground">
                    {prediction.explainability.neighbor_benchmark.min_actual_ttt.toFixed(1)}–
                    {prediction.explainability.neighbor_benchmark.max_actual_ttt.toFixed(1)} min
                  </span>{" "}
                  (n={prediction.explainability.neighbor_benchmark.n})
                </p>
              ) : null}
              {prediction.explainability?.similar_heats?.[0] ? (
                <p className="text-sm">
                  Closest heat{" "}
                  <span className="font-mono font-medium">
                    {prediction.explainability.similar_heats[0].heat_id}
                  </span>
                  {" · "}
                  {prediction.explainability.similar_heats[0].similarity_pct.toFixed(0)}% similar
                  {prediction.explainability.similar_heats[0].actual_ttt != null
                    ? ` · actual ${prediction.explainability.similar_heats[0].actual_ttt.toFixed(1)} min`
                    : ""}
                </p>
              ) : null}
              <p className="text-sm">
                <span className="text-label">Status:</span> {prediction.operator_summary?.process_status}
              </p>
              <p className="text-sm">
                <span className="text-label">Confidence:</span> {prediction.operator_summary?.confidence}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <ConfidenceRing
                score={85}
                tier={prediction.operator_summary?.confidence?.toUpperCase() ?? "HIGH"}
              />
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Current production limitations">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Retrospective Electrical Energy features unsuitable for pre-heat planning without caution</li>
            <li>• Delay/abnormal heats not modeled separately in production (single regressor)</li>
            <li>• ~3 min MAE ceiling on existing columns (Phase 26 information ceiling)</li>
            <li>• Charge band is advisory (80–150 t) for prediction and optimizer — out-of-band heats warn, do not block</li>
          </ul>
        </SectionCard>
        <SectionCard title="Expected future improvements">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• P0 MES/SCADA: delay codes, power-on/off, restriction flag</li>
            <li>• Shadow-deploy two-stage architecture (Phase 25) after instrumentation</li>
            <li>• Sub-2.5 min target with full digital twin V2 sensor suite</li>
            <li>• Planning-safe optimizer replacing retrospective energy inputs</li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="Model Information" description="Production artifacts and feature schema" className="mt-4">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-label">Artifacts</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {info?.artifacts
                ? Object.entries(info.artifacts).map(([key, value]) => (
                    <li key={key}>
                      <span className="font-medium text-foreground">{key}:</span> {value}
                    </li>
                  ))
                : null}
            </ul>
          </div>
          <div>
            <p className="text-label">Feature List ({info?.features?.length ?? 0})</p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {info?.features?.map((f) => (
                <li key={f} className="font-mono text-muted-foreground">
                  {formatVariableLabel(f)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
