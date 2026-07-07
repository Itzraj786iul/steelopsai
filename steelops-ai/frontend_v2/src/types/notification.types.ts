export interface AgentApproval {
  id: string;
  agent_id?: string;
  recommendation?: string;
  confidence?: number;
  title?: string;
  status: string;
  heat_id?: string | null;
  requester?: string | null;
  created_at?: string;
  approval_type?: string;
  action?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  title: string;
  status: string;
  assignee?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  category: string;
  title: string;
  message: string;
  href?: string;
  read: boolean;
  created_at: string;
  priority: "low" | "medium" | "high" | "critical";
}
