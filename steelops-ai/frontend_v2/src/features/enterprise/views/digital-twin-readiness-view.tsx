"use client";

import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

const ROADMAP = [
  { phase: "Phase 27", item: "Industrial data gap analysis", status: "Complete" },
  { phase: "Phase 33", item: "Product integration", status: "Complete" },
  { phase: "Phase 34–36", item: "Operator & shift UX", status: "Complete" },
  { phase: "Phase 37", item: "Enterprise readiness", status: "In Progress" },
  { phase: "Future", item: "SCADA/MES live feed", status: "Planned" },
  { phase: "Future", item: "Full digital twin twinning", status: "Planned" },
];

export function DigitalTwinReadinessView() {
  const active = useCurrentHeatStore((s) => s.active);
  const readiness = active?.prediction?.explainability?.digital_twin_readiness;
  const overall = readiness?.overall_score ?? 72;
  const tier = readiness?.readiness_tier ?? "Developing";

  const layers = readiness?.layers ?? {
    data_availability: { score: 68, status: "Partial" },
    sensor_coverage: { score: 55, status: "Limited" },
    delay_codes: { score: 40, status: "Missing" },
    power_on_data: { score: 85, status: "Good" },
    metallization: { score: 70, status: "Partial" },
    scada_integration: { score: 25, status: "Not Connected" },
    mes_integration: { score: 20, status: "Not Connected" },
  };

  const layerLabels: Record<string, string> = {
    data_availability: "Data Availability",
    sensor_coverage: "Sensor Coverage",
    delay_codes: "Delay Codes",
    power_on_data: "Power-On Data",
    metallization: "Metallization",
    scada_integration: "SCADA Integration",
    mes_integration: "MES Integration",
  };

  return (
    <PageContainer title="Digital Twin Readiness" description="Expanded readiness assessment for enterprise deployment">
      <SectionCard title="Twin Readiness Score">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="font-mono text-5xl font-bold text-primary">{overall.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">Tier: {tier}</p>
          </div>
          <Progress value={overall} className="h-3 max-w-md flex-1" aria-label={`Digital twin readiness ${overall}%`} />
        </div>
      </SectionCard>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(layers).map(([key, layer]) => (
          <SectionCard key={key} title={layerLabels[key] ?? key}>
            <p className="font-mono text-2xl font-bold">{layer.score}%</p>
            <Badge variant="outline" className="mt-2">{layer.status}</Badge>
            <Progress value={layer.score} className="mt-3 h-2" />
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Roadmap" className="mt-6">
        <ul className="space-y-2 text-sm">
          {ROADMAP.map((r) => (
            <li key={r.item} className="flex items-center justify-between border-b border-border/40 py-2">
              <span><strong>{r.phase}</strong> — {r.item}</span>
              <Badge variant={r.status === "Complete" ? "default" : "outline"}>{r.status}</Badge>
            </li>
          ))}
        </ul>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/eaf/research/digital-twin">Research Digital Twin Details</Link>
        </Button>
      </SectionCard>
    </PageContainer>
  );
}
