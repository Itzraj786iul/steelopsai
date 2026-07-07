import { apiClient } from "@/services/api-client";
import type { AgentApproval } from "@/types";

export type ApprovalDecision = "APPROVE" | "REJECT" | "MODIFY" | "ESCALATE";

export const agentsApi = {
  approvals: (status = "PENDING") =>
    apiClient.get<AgentApproval[]>("/api/v1/approvals", { params: { status } }),
  decideApproval: (approvalId: string, decision: ApprovalDecision, comment?: string) =>
    apiClient.post<{ status: string; id: string }>(`/api/v1/approvals/${approvalId}/decide`, {
      decision,
      comment,
    }),
};
