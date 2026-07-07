import { NotificationCategory } from "@/lib/enums";
import type { AgentApproval } from "@/types";
import type { LiveHeatSummary } from "@/types/live.types";
import type { NotificationItem } from "@/types";

export function mapApprovalsToNotifications(approvals: AgentApproval[]): NotificationItem[] {
  return approvals.map((approval) => ({
    id: `approval-${approval.id}`,
    category: NotificationCategory.Approval,
    title: approval.title || approval.recommendation?.slice(0, 120) || "Approval required",
    message: approval.heat_id ? `Heat approval pending review` : "Review and decide on this request",
    href: `/approvals/${approval.id}`,
    read: false,
    created_at: approval.created_at ?? new Date().toISOString(),
    priority: "high" as const,
  }));
}

export function mapLiveHeatsToNotifications(heats: LiveHeatSummary[]): NotificationItem[] {
  return heats.slice(0, 5).map((heat) => ({
    id: `live-${heat.id}`,
    category: NotificationCategory.Alert,
    title: `Live heat ${heat.heat_number}`,
    message: heat.stage ? `${heat.stage} · ${heat.progress_pct ?? 0}% complete` : "Active on the floor",
    href: `/live/${heat.id}`,
    read: false,
    created_at: new Date().toISOString(),
    priority: "medium" as const,
  }));
}

export function groupNotificationsByDay(items: NotificationItem[]): Record<"today" | "earlier", NotificationItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return items.reduce(
    (acc, item) => {
      const created = new Date(item.created_at);
      const bucket = created >= today ? "today" : "earlier";
      acc[bucket].push(item);
      return acc;
    },
    { today: [] as NotificationItem[], earlier: [] as NotificationItem[] }
  );
}
