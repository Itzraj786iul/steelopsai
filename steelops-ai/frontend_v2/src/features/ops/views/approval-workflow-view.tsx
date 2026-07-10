"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { opsApi } from "@/lib/api/ops";
import { getApiErrorMessage } from "@/services/api-client";

interface ApprovalRow {
  id: string;
  heat_number: string;
  stage: string;
  status: string;
  operator_at?: string;
  shift_engineer_at?: string;
  production_manager_at?: string;
  approved_at?: string;
  executed_at?: string;
  validated_at?: string;
}

const ACTIONS = [
  { action: "submit", label: "Submit (Operator)" },
  { action: "approve_shift", label: "Approve (Shift Eng)" },
  { action: "approve_pm", label: "Approve (PM)" },
  { action: "execute", label: "Mark Executed" },
  { action: "validate", label: "Validate" },
  { action: "reject", label: "Reject" },
];

export function ApprovalWorkflowView() {
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [heatNumber, setHeatNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    opsApi
      .approvals()
      .then(({ data }) => setRows(data as ApprovalRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load approvals")));
  };

  useEffect(() => {
    load();
  }, []);

  const start = async () => {
    if (!heatNumber.trim()) return;
    try {
      await opsApi.startApproval({ heat_number: heatNumber.trim() });
      setHeatNumber("");
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to start approval"));
    }
  };

  const act = async (id: string, action: string) => {
    try {
      await opsApi.approvalAction(id, action);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Action failed"));
    }
  };

  return (
    <PageContainer
      title="Approval Workflow"
      description="Operator → Shift Engineer → Production Manager → Approved → Executed → Validated"
    >
      <SectionCard title="Start recommendation approval">
        <div className="flex gap-3">
          <div className="flex-1">
            <Label>Heat number</Label>
            <Input value={heatNumber} onChange={(e) => setHeatNumber(e.target.value)} />
          </div>
          <Button className="mt-6" onClick={() => void start()}>Start</Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Workflows">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Stage</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Timestamps</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.heat_number}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.stage}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.status}</EnterpriseTableCell>
                <EnterpriseTableCell className="max-w-xs text-xs text-muted-foreground">
                  {[
                    r.operator_at && `Op ${r.operator_at.slice(0, 16)}`,
                    r.shift_engineer_at && `SE ${r.shift_engineer_at.slice(0, 16)}`,
                    r.production_manager_at && `PM ${r.production_manager_at.slice(0, 16)}`,
                    r.executed_at && `Ex ${r.executed_at.slice(0, 16)}`,
                    r.validated_at && `Val ${r.validated_at.slice(0, 16)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </EnterpriseTableCell>
                <EnterpriseTableCell className="flex flex-wrap gap-1">
                  {ACTIONS.map((a) => (
                    <Button key={a.action} size="sm" variant="outline" onClick={() => void act(r.id, a.action)}>
                      {a.label}
                    </Button>
                  ))}
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
