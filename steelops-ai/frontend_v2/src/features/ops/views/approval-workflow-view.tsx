"use client";

import { useEffect, useMemo, useState } from "react";

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
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@/lib/enums";
import { normalizeRole } from "@/lib/rbac/permissions";
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

const ALL_ACTIONS = [
  { action: "submit", label: "Submit (Operator)", roles: [UserRole.Operator, UserRole.Admin] },
  { action: "approve_shift", label: "Approve (Shift Eng)", roles: [UserRole.ShiftEngineer, UserRole.Admin] },
  { action: "approve_pm", label: "Approve (PM)", roles: [UserRole.ProductionManager, UserRole.Admin] },
  { action: "execute", label: "Mark Executed", roles: [UserRole.ProductionManager, UserRole.ShiftEngineer, UserRole.Admin] },
  { action: "validate", label: "Validate", roles: [UserRole.QualityEngineer, UserRole.ProductionManager, UserRole.Admin] },
  { action: "reject", label: "Reject", roles: [UserRole.ShiftEngineer, UserRole.ProductionManager, UserRole.PlantManager, UserRole.Admin] },
] as const;

export function ApprovalWorkflowView() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || "operator");
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [heatNumber, setHeatNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(
    () => ALL_ACTIONS.filter((a) => a.roles.includes(role as UserRole) || role === UserRole.Admin),
    [role]
  );

  const canStart = [UserRole.Operator, UserRole.ShiftEngineer, UserRole.ProductionManager, UserRole.Admin].includes(
    role as UserRole
  );

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
      {canStart ? (
        <SectionCard title="Start recommendation approval">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>Heat number</Label>
              <Input value={heatNumber} onChange={(e) => setHeatNumber(e.target.value)} />
            </div>
            <Button className="mt-6" onClick={() => void start()}>
              Start
            </Button>
          </div>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </SectionCard>
      ) : (
        <SectionCard title="Oversight mode" className="mb-4">
          <p className="text-sm text-muted-foreground">
            Your role can review and reject workflows. Stage approvals are handled by Shift Engineer / Production Manager.
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </SectionCard>
      )}

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
                  {actions.map((a) => (
                    <Button key={a.action} size="sm" variant="outline" onClick={() => void act(r.id, a.action)}>
                      {a.label}
                    </Button>
                  ))}
                  {!actions.length ? <span className="text-xs text-muted-foreground">View only</span> : null}
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
