"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { exportAuditsJson, useAuditStore } from "@/stores/audit-store";
import { useCurrentHeatStore } from "@/stores/current-heat-store";
import { usePerformanceStore } from "@/stores/performance-store";
import { usePlantConfigStore } from "@/stores/plant-config-store";
import { downloadText } from "@/features/enterprise/components/audit-export-bar";
import { APP_VERSION } from "@/lib/constants";

export function SessionBackupView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportFull = () => {
    const heat = useCurrentHeatStore.getState();
    const payload = {
      exported_at: new Date().toISOString(),
      app_version: APP_VERSION,
      current_heat: heat.active,
      session_history: heat.sessionHistory,
      operator_activity: heat.operatorActivity,
      audits: JSON.parse(exportAuditsJson()),
      performance: usePerformanceStore.getState().samples,
      plant_config: {
        chargeMin: usePlantConfigStore.getState().chargeMin,
        chargeMax: usePlantConfigStore.getState().chargeMax,
        confidenceHighThreshold: usePlantConfigStore.getState().confidenceHighThreshold,
        confidenceLowThreshold: usePlantConfigStore.getState().confidenceLowThreshold,
        defaultExportFormat: usePlantConfigStore.getState().defaultExportFormat,
        unitSystem: usePlantConfigStore.getState().unitSystem,
        reportBranding: usePlantConfigStore.getState().reportBranding,
        reportFooter: usePlantConfigStore.getState().reportFooter,
      },
    };
    downloadText(JSON.stringify(payload, null, 2), `steelops_session_backup_${Date.now()}.json`, "application/json");
    setMessage("Session exported successfully.");
    setError(null);
  };

  const importFull = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data.current_heat !== undefined) {
          useCurrentHeatStore.setState({
            active: data.current_heat,
            sessionHistory: data.session_history ?? [],
            operatorActivity: data.operator_activity ?? [],
          });
        }
        if (data.audits?.predictionAudits) {
          useAuditStore.setState({
            predictionAudits: data.audits.predictionAudits,
            recommendationAudits: data.audits.recommendationAudits ?? [],
          });
        }
        if (data.performance?.samples) {
          usePerformanceStore.setState({ samples: data.performance.samples });
        }
        if (data.plant_config && typeof data.plant_config === "object") {
          const { chargeMin, chargeMax, confidenceHighThreshold, confidenceLowThreshold, defaultExportFormat, unitSystem, reportBranding, reportFooter } = data.plant_config;
          usePlantConfigStore.getState().setConfig({
            ...(chargeMin != null ? { chargeMin } : {}),
            ...(chargeMax != null ? { chargeMax } : {}),
            ...(confidenceHighThreshold != null ? { confidenceHighThreshold } : {}),
            ...(confidenceLowThreshold != null ? { confidenceLowThreshold } : {}),
            ...(defaultExportFormat ? { defaultExportFormat } : {}),
            ...(unitSystem ? { unitSystem } : {}),
            ...(reportBranding ? { reportBranding } : {}),
            ...(reportFooter ? { reportFooter } : {}),
          });
        }
        setMessage("Workspace restored from backup.");
        setError(null);
      } catch {
        setError("Invalid backup file format.");
        setMessage(null);
      }
    };
    reader.readAsText(file);
  };

  return (
    <PageContainer title="Session Backup" description="Export or import complete workspace — heat, history, audits, config">
      <SectionCard title="Export Complete Session">
        <p className="text-sm text-muted-foreground mb-4">
          Includes current heat, session history, validation state, audit trails, performance metrics, and plant configuration.
        </p>
        <Button onClick={exportFull}>
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Export Session (JSON)
        </Button>
      </SectionCard>

      <SectionCard title="Import Session" className="mt-6">
        <p className="text-sm text-muted-foreground mb-4">Restores workspace from a previously exported JSON backup file.</p>
        <input ref={fileRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Import session backup file"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importFull(f); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" aria-hidden />
          Import Session
        </Button>
      </SectionCard>

      {message ? <p className="mt-4 text-sm text-emerald-600" role="status">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
    </PageContainer>
  );
}
