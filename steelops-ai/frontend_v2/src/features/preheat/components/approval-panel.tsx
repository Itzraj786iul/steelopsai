"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ActionButton } from "@/components/data-display/action-button";
import { SectionCard } from "@/components/layout/section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { agentsApi } from "@/lib/api/agents";
import { queryKeys } from "@/lib/query-keys";
import { getApiErrorMessage } from "@/services/api-client";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

interface ApprovalPanelProps {
  packageData: PreheatDecisionPackage;
  approvalId?: string;
  onDecided?: () => void;
}

export function ApprovalPanel({ packageData, approvalId, onDecided }: ApprovalPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (decision: "APPROVE" | "REJECT" | "ESCALATE") => {
      if (!approvalId) {
        return { status: decision, id: "local" };
      }
      const response = await agentsApi.decideApproval(approvalId, decision, comment || undefined);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list("PENDING") });
      onDecided?.();
      router.push("/dashboard");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <SectionCard title="Operator decision" description={`Requires ${packageData.approval_requirements}`}>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="approval-comment">Comments</Label>
          <Input
            id="approval-comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Add shift notes or review comments"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <ActionButton disabled={mutation.isPending} onClick={() => mutation.mutate("APPROVE")}>
            Approve
          </ActionButton>
          <ActionButton variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("REJECT")}>
            Reject
          </ActionButton>
          <ActionButton variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate("ESCALATE")}>
            Request review
          </ActionButton>
        </div>
      </div>
    </SectionCard>
  );
}

export function InterventionSummary({
  current,
  recommended,
  explanation,
}: {
  current: Record<string, number>;
  recommended: Record<string, number>;
  explanation: string;
}) {
  const keys = ["HM", "DRI", "CPC", "LIME", "DOLO", "HBI", "T C"];

  return (
    <SectionCard title="Intervention summary" description="Current vs recommended recipe changes">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Variable</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Recommended</th>
              <th className="px-4 py-3">Difference</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const base = Number(current[key] ?? 0);
              const next = Number(recommended[key] ?? 0);
              const delta = next - base;
              return (
                <tr key={key} className="border-t">
                  <td className="px-4 py-3">{key}</td>
                  <td className="px-4 py-3 font-mono">{base.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">{next.toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono">{delta.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{explanation}</p>
    </SectionCard>
  );
}
