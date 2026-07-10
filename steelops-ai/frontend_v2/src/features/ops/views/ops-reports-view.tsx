"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { opsApi } from "@/lib/api/ops";
import { getApiErrorMessage } from "@/services/api-client";

export function OpsReportsView() {
  const [kind, setKind] = useState("daily");
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    opsApi
      .report(kind)
      .then(({ data }) => setReport(data as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to generate report")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <PageContainer title="Operations Reports" description="Daily, weekly, monthly, shift, operator, furnace, department">
      <div className="mb-4 flex gap-3">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["daily", "weekly", "monthly", "shift", "operator", "supervisor", "furnace", "department"].map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void load()}>Refresh</Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <SectionCard title={`${kind} report`}>
        <pre className="max-h-[60vh] overflow-auto rounded bg-muted/40 p-3 text-xs">
          {report ? JSON.stringify(report, null, 2) : "Loading…"}
        </pre>
      </SectionCard>
    </PageContainer>
  );
}
