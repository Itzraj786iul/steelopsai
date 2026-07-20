"use client";

import { useEffect, useState } from "react";

import { PageAlert } from "@/components/feedback/page-alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Input } from "@/components/ui/input";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { eafClient } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

interface AuditRow {
  id: string;
  user_email?: string;
  action: string;
  resource?: string;
  heat_number?: string;
  ip?: string;
  created_at: string;
  reason?: string;
}

export function AuditLogView() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      eafClient
        .get<AuditRow[]>("/admin/audit", { params: { q: q || undefined, limit: 200 } })
        .then(({ data }) => setRows(data))
        .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load audit log")));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <PageContainer title="Audit Log" description="Every authenticated action is recorded">
      <SectionCard title="Search" description="Filter by action, email, or heat number">
        <Input placeholder="Filter by action, email, heat…" value={q} onChange={(e) => setQ(e.target.value)} />
        {error ? <PageAlert tone="error" className="mt-3">{error}</PageAlert> : null}
      </SectionCard>
      <SectionCard title={`Events (${rows.length})`}>
        {rows.length ? (
          <EnterpriseTable>
            <EnterpriseTableHead>
              <EnterpriseTableHeaderCell>Time</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>User</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Action</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Resource</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>IP</EnterpriseTableHeaderCell>
            </EnterpriseTableHead>
            <EnterpriseTableBody>
              {rows.map((r) => (
                <EnterpriseTableRow key={r.id}>
                  <EnterpriseTableCell mono>{r.created_at}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.user_email || "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.action}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.resource || "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.heat_number || "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.ip || "—"}</EnterpriseTableCell>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </EnterpriseTable>
        ) : (
          <EmptyState
            title="No audit events"
            description={q ? "Try a different search." : "Actions will appear here as users work the floor."}
            className="py-10"
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
