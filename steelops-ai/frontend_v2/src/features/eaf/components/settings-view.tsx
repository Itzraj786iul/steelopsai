"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  APP_NAME,
  APP_VERSION,
  DATASET_VERSION,
  EAF_API_URL,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";
import { eafApi } from "@/lib/api/eaf";
import { useEafModelInfo } from "@/features/eaf/hooks/use-eaf";
import { usePlantConfigStore } from "@/stores/plant-config-store";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { info } = useEafModelInfo();
  const config = usePlantConfigStore();
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const [modelLoaded, setModelLoaded] = useState(false);

  useEffect(() => {
    eafApi
      .health()
      .then(({ data }) => {
        setApiStatus(data.status === "ok" ? "online" : "offline");
        setModelLoaded(data.model_loaded);
      })
      .catch(() => setApiStatus("offline"));
  }, []);

  return (
    <PageContainer title="Settings" description="Application preferences, version registry, and platform status">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Theme" description="Interface appearance for control-room and office use">
          <div className="flex flex-wrap gap-3">
            <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>
            <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="API Status" description="Connection to the JSPL EAF ML backend">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Backend</span>
              <Badge variant={apiStatus === "online" ? "default" : "destructive"}>
                {apiStatus === "loading" ? "Checking…" : apiStatus === "online" ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Model loaded</span>
              <Badge variant={modelLoaded ? "default" : "outline"}>{modelLoaded ? "Yes" : "No"}</Badge>
            </div>
            <p className="break-all font-mono text-xs text-muted-foreground">{EAF_API_URL}</p>
          </div>
        </SectionCard>

        <SectionCard title="Plant Configuration" description="Operational thresholds and export defaults — no ML parameters">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="charge-min">Historical Charge Min (t)</Label>
              <Input id="charge-min" type="number" className="mt-1" value={config.chargeMin} onChange={(e) => config.setConfig({ chargeMin: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="charge-max">Historical Charge Max (t)</Label>
              <Input id="charge-max" type="number" className="mt-1" value={config.chargeMax} onChange={(e) => config.setConfig({ chargeMax: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="conf-high">Confidence High Threshold (%)</Label>
              <Input id="conf-high" type="number" className="mt-1" value={config.confidenceHighThreshold} onChange={(e) => config.setConfig({ confidenceHighThreshold: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label htmlFor="conf-low">Confidence Low Threshold (%)</Label>
              <Input id="conf-low" type="number" className="mt-1" value={config.confidenceLowThreshold} onChange={(e) => config.setConfig({ confidenceLowThreshold: parseFloat(e.target.value) })} />
            </div>
            <div>
              <Label>Default Export Format</Label>
              <Select value={config.defaultExportFormat} onValueChange={(v) => config.setConfig({ defaultExportFormat: v as "json" | "csv" | "pdf" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Units</Label>
              <Select value={config.unitSystem} onValueChange={(v) => config.setConfig({ unitSystem: v as "metric" | "imperial" })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="metric">Metric (t, kWh)</SelectItem>
                  <SelectItem value="imperial">Imperial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="branding">Report Branding</Label>
              <Input id="branding" className="mt-1" value={config.reportBranding} onChange={(e) => config.setConfig({ reportBranding: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="footer">Report Footer</Label>
              <Input id="footer" className="mt-1" value={config.reportFooter} onChange={(e) => config.setConfig({ reportFooter: e.target.value })} />
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => config.resetConfig()}>Reset to defaults</Button>
        </SectionCard>

        <SectionCard title="Version Registry" className="lg:col-span-2">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Frontend Version</dt>
              <dd className="font-mono">{APP_NAME} v{APP_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Backend Version</dt>
              <dd className="font-mono">FastAPI EAF Service</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Model Version</dt>
              <dd className="text-right font-mono">{info?.model_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Phase (Production)</dt>
              <dd className="font-mono">{PRODUCTION_MODEL_PHASE}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Optimizer</dt>
              <dd className="font-mono">{info?.optimizer_version ?? OPTIMIZER_PHASE}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Research Version</dt>
              <dd className="font-mono">{RESEARCH_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Dataset Version</dt>
              <dd className="text-right text-muted-foreground">{DATASET_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
              <dt className="text-muted-foreground">Production Status</dt>
              <dd>
                <Badge>DEPLOYED — frozen</Badge>
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Platform" description="JSPL Electric Arc Furnace decision support" className="lg:col-span-2">
          <p className="text-sm text-muted-foreground">
            This deployment integrates the frozen {PRODUCTION_MODEL_PHASE} production model and {OPTIMIZER_PHASE}{" "}
            physics-guided optimizer. Phase 28 UI enhancements do not modify ML artifacts, feature engineering, or API
            prediction logic. Research content (Phases 23–27) is informational only.
          </p>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
