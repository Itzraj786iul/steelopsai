"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

export function DelayDashboardView() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mesApi
      .delayDashboard()
      .then(({ data: d }) => setData(d as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load delay dashboard")));
  }, []);

  const pareto = (data?.pareto || []) as { category: string; frequency: number; total_duration_min: number }[];
  const timeline = (data?.timeline || []) as { heat_number?: string; category: string; start_time: string; duration_min?: number }[];

  return (
    <PageContainer title="Delay Dashboard" description="Pareto · timeline · heatmap · frequency · duration">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <SectionCard title="Delay Pareto">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Category</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Frequency</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Total duration (min)</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {pareto.map((r) => (
              <EnterpriseTableRow key={r.category}>
                <EnterpriseTableCell>{r.category}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.frequency}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.total_duration_min}</EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
      <SectionCard title="Delay timeline" className="mt-4">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Category</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Start</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Duration</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {timeline.map((r, i) => (
              <EnterpriseTableRow key={i}>
                <EnterpriseTableCell>{r.heat_number || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.category}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.start_time?.slice(0, 16)}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.duration_min ?? "—"}</EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
      <SectionCard title="Heatmap (category × hour)" className="mt-4">
        <pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(data?.heatmap ?? {}, null, 2)}</pre>
      </SectionCard>
    </PageContainer>
  );
}
