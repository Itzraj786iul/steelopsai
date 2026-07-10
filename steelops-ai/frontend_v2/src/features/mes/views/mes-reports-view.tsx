"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

export function MesReportsView() {
  const [kind, setKind] = useState("daily");
  const [report, setReport] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    mesApi
      .report(kind)
      .then(({ data }) => setReport(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Report failed")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const download = async (fmt: "csv" | "excel" | "json" | "pdf") => {
    try {
      const { data } = await mesApi.export(kind === "daily" ? "daily" : kind, fmt);
      if (fmt === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mes_${kind}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = data as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mes_${kind}.${fmt === "excel" ? "xlsx" : fmt}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Export failed"));
    }
  };

  return (
    <PageContainer title="MES Reports" description="Shift / daily / weekly / monthly / planning / delay / operator">
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["shift", "daily", "weekly", "monthly", "planning_vs_actual", "delay", "operator", "supervisor"].map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()}>Refresh</Button>
        {(["csv", "excel", "json", "pdf"] as const).map((f) => (
          <Button key={f} size="sm" variant="secondary" onClick={() => void download(f)}>Export {f.toUpperCase()}</Button>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <SectionCard title={`${kind} report`}>
        <pre className="max-h-[65vh] overflow-auto text-xs">{report ? JSON.stringify(report, null, 2) : "Loading…"}</pre>
      </SectionCard>
    </PageContainer>
  );
}
