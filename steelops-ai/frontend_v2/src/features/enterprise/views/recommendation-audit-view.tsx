"use client";

import { useMemo } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { AuditExportBar, downloadText } from "@/features/enterprise/components/audit-export-bar";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { useAuditStore } from "@/stores/audit-store";

export function RecommendationAuditView() {
  const records = useAuditStore((s) => s.recommendationAudits);

  const stats = useMemo(() => {
    const total = records.length;
    const accepted = records.filter((r) => r.acceptance === "Accepted").length;
    const modified = records.filter((r) => r.acceptance === "Modified").length;
    const rejected = records.filter((r) => r.acceptance === "Rejected").length;
    const pending = records.filter((r) => !r.acceptance).length;
    return { total, accepted, modified, rejected, pending, acceptanceRate: total ? (accepted / total) * 100 : null };
  }, [records]);

  return (
    <PageContainer title="Recommendation Audit" description="History of optimizer recommendations and operator decisions">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total Recommendations" value={String(stats.total)} />
        <StatCard label="Accepted" value={String(stats.accepted)} />
        <StatCard label="Modified" value={String(stats.modified)} />
        <StatCard label="Rejected" value={String(stats.rejected)} />
        <StatCard label="Acceptance Rate" value={stats.acceptanceRate != null ? `${stats.acceptanceRate.toFixed(0)}%` : "—"} />
      </div>

      <SectionCard title="Export" className="mt-6">
        <AuditExportBar
          disabled={!records.length}
          onExportJson={() => downloadText(JSON.stringify(records, null, 2), `recommendation_audit_${Date.now()}.json`, "application/json")}
          onExportCsv={() => {
            const headers = ["timestamp", "heatNumber", "shift", "acceptance", "improvementMin", "validationOutcome"];
            const rows = records.map((r) => headers.map((h) => String(r[h as keyof typeof r] ?? "")).join(","));
            downloadText([headers.join(","), ...rows].join("\n"), `recommendation_audit_${Date.now()}.csv`, "text/csv");
          }}
        />
      </SectionCard>

      <SectionCard title="Recommendation History" className="mt-6">
        {!records.length ? (
          <p className="text-sm text-muted-foreground">No optimizer recommendations recorded yet.</p>
        ) : (
          <EnterpriseTable>
            <EnterpriseTableHead>
              <EnterpriseTableHeaderCell>Time</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Shift</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Saving</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Decision</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Validation</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Optimizer</EnterpriseTableHeaderCell>
            </EnterpriseTableHead>
            <EnterpriseTableBody>
              {records.map((r) => (
                <EnterpriseTableRow key={r.id}>
                  <EnterpriseTableCell>{new Date(r.timestamp).toLocaleString()}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.heatNumber || "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.shift}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.improvementMin != null ? `${r.improvementMin.toFixed(2)} min` : "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.acceptance ?? "Pending"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.validationOutcome ?? "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.optimizerVersion}</EnterpriseTableCell>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </EnterpriseTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <SectionCard title={label}>
      <p className="font-mono text-2xl font-bold">{value}</p>
    </SectionCard>
  );
}
