"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_NAME, APP_VERSION, EAF_API_URL } from "@/lib/constants";
import { eafApi } from "@/lib/api/eaf";
import { useEafModelInfo } from "@/features/eaf/hooks/use-eaf";

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { info } = useEafModelInfo();
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
    <PageContainer title="Settings" description="Application preferences and platform status">
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Theme" description="Interface appearance for control-room and office use">
          <div className="flex flex-wrap gap-3">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-2 h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
            >
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

        <SectionCard title="Versions">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Application</dt>
              <dd className="font-mono">{APP_NAME} v{APP_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Model</dt>
              <dd className="text-right font-mono">{info?.model_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Optimizer</dt>
              <dd className="font-mono">{info?.optimizer_version ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Backend API</dt>
              <dd className="font-mono">FastAPI / Render</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Platform" description="JSPL Electric Arc Furnace decision support">
          <p className="text-sm text-muted-foreground">
            This deployment integrates the frozen Phase 19 production model and Phase 20.2 physics-guided
            optimizer. No authentication backend is required for EAF workflows in guest mode.
          </p>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
