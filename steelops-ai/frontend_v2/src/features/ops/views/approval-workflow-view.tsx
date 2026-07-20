"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  { action: "submit", label: "Submit", roles: [UserRole.Operator, UserRole.Admin] },
  { action: "approve_shift", label: "SE Approve", roles: [UserRole.ShiftEngineer, UserRole.Admin] },
  { action: "approve_pm", label: "PM Approve", roles: [UserRole.ProductionManager, UserRole.Admin] },
  { action: "execute", label: "Execute", roles: [UserRole.ProductionManager, UserRole.ShiftEngineer, UserRole.Admin] },
  { action: "validate", label: "Validate", roles: [UserRole.QualityEngineer, UserRole.ProductionManager, UserRole.Admin] },
  { action: "reject", label: "Reject", roles: [UserRole.ShiftEngineer, UserRole.ProductionManager, UserRole.PlantManager, UserRole.Admin] },
] as const;

const STAGES = ["Operator", "ShiftEngineer", "ProductionManager", "Approved", "Executed", "Validated"] as const;

export function ApprovalWorkflowView() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role || "operator");
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [heatNumber, setHeatNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo(
    () => ALL_ACTIONS.filter((a) => (a.roles as readonly UserRole[]).includes(role as UserRole) || role === UserRole.Admin),
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
      setError(null);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to start approval"));
    }
  };

  const act = async (id: string, action: string) => {
    try {
      await opsApi.approvalAction(id, action);
      setError(null);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Action failed"));
    }
  };

  return (
    <PageContainer
      title="Approval Workflow"
      description="Operator → Shift Engineer → Production Manager → Approved → Executed → Validated"
      meta={
        <div className="flex flex-wrap gap-1.5 pt-1">
          {STAGES.map((s, i) => (
            <Badge key={s} variant="outline" className="text-[10px] font-normal">
              {i + 1}. {s.replace(/([A-Z])/g, " $1").trim()}
            </Badge>
          ))}
        </div>
      }
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      {canStart ? (
        <SectionCard title="Start recommendation approval" description="Begin a new approval trail for a heat">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <Label htmlFor="approval-heat">Heat number</Label>
              <Input
                id="approval-heat"
                value={heatNumber}
                onChange={(e) => setHeatNumber(e.target.value)}
                placeholder="e.g. 4618213"
              />
            </div>
            <Button onClick={() => void start()} disabled={!heatNumber.trim()}>
              Start workflow
            </Button>
          </div>
        </SectionCard>
      ) : (
        <PageAlert tone="info" title="Oversight mode">
          Your role can review and reject workflows. Stage approvals are handled by Shift Engineer / Production Manager.
        </PageAlert>
      )}

      <SectionCard title="Workflows" description={`${rows.length} open or recent trails`}>
        {rows.length ? (
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
                  <EnterpriseTableCell className="font-medium">{r.heat_number}</EnterpriseTableCell>
                  <EnterpriseTableCell>
                    <Badge variant="secondary">{r.stage}</Badge>
                  </EnterpriseTableCell>
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
                  <EnterpriseTableCell>
                    <div className="flex flex-wrap gap-1">
                      {actions.map((a) => (
                        <Button
                          key={a.action}
                          size="sm"
                          variant={a.action === "reject" ? "destructive" : "outline"}
                          onClick={() => void act(r.id, a.action)}
                        >
                          {a.label}
                        </Button>
                      ))}
                      {!actions.length ? <span className="text-xs text-muted-foreground">View only</span> : null}
                    </div>
                  </EnterpriseTableCell>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </EnterpriseTable>
        ) : (
          <EmptyState
            title="No approval workflows"
            description={canStart ? "Start one above with a heat number." : "Nothing pending for your role."}
            className="py-10"
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
