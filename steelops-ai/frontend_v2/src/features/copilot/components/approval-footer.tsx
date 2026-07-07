"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  ChevronDown,
  Download,
  MessageSquare,
  Play,
  Share2,
  XCircle,
} from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { agentsApi } from "@/lib/api/agents";
import { queryKeys } from "@/lib/query-keys";
import { exportPackageJson } from "@/features/copilot/utils/copilot-utils";
import { useStartHeat } from "@/features/live/hooks/use-live-heat";
import { useCelebrationStore } from "@/stores/celebration-store";
import { getApiErrorMessage } from "@/services/api-client";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

interface ApprovalFooterProps {
  pkg: PreheatDecisionPackage;
  approvalId?: string;
  heatId?: string | null;
}

export function ApprovalFooter({ pkg, approvalId, heatId }: ApprovalFooterProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const startHeat = useStartHeat();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const triggerCelebration = useCelebrationStore((s) => s.trigger);

  const mutation = useMutation({
    mutationFn: async (decision: "APPROVE" | "REJECT" | "ESCALATE") => {
      if (!approvalId) return { status: decision, id: "local" };
      const response = await agentsApi.decideApproval(approvalId, decision, comment || undefined);
      return response.data;
    },
    onSuccess: async (_data, decision) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list("PENDING") });
      if (decision === "APPROVE") triggerCelebration("approval_success", "Recipe approved — ready to charge");
      router.push("/dashboard");
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const shareLink = async () => {
    const url = `${window.location.origin}/copilot?heatId=${heatId ?? pkg.package_id}`;
    if (navigator.share) {
      await navigator.share({ title: "SteelOps Mission", url });
      return;
    }
    await navigator.clipboard.writeText(url);
  };

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-background/95 shadow-elevation-md backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 md:px-8 lg:flex-row lg:items-center lg:py-4">
        <div className="min-w-0 flex-1">
          <p className="text-label">Decision</p>
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional shift comment for audit trail"
            className="mt-1 h-10 w-full max-w-xl rounded-lg border border-border bg-card px-3 text-sm"
            aria-label="Approval comments"
          />
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ActionButton disabled={mutation.isPending} onClick={() => mutation.mutate("APPROVE")}>
            <CheckCircle className="h-4 w-4" />
            Approve recipe
          </ActionButton>
          <ActionButton
            variant="secondary"
            disabled={!heatId || startHeat.isPending}
            onClick={() => {
              if (!heatId) return;
              startHeat.mutate(
                { heatId, recipe: pkg.recommended_optimized_recipe as Record<string, unknown> },
                { onSuccess: () => router.push(`/live/${heatId}`) }
              );
            }}
          >
            <Play className="h-4 w-4" />
            Start heat
          </ActionButton>
          <ActionButton variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("REJECT")}>
            <XCircle className="h-4 w-4" />
            Reject
          </ActionButton>
          <ActionButton variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate("ESCALATE")}>
            <MessageSquare className="h-4 w-4" />
            Escalate
          </ActionButton>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ActionButton variant="ghost">
                More
                <ChevronDown className="h-4 w-4" />
              </ActionButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void shareLink()}>
                <Share2 className="mr-2 h-4 w-4" />
                Share link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPackageJson(pkg)}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}>Print / PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/decision-package")}>Full package</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </footer>
  );
}
