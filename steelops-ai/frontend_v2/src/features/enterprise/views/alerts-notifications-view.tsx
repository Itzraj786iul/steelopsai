"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { eafClient } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

interface AlertRow {
  id: string;
  severity: string;
  title: string;
  message: string;
  heat_number?: string;
  is_acknowledged: number;
  created_at: string;
}

interface NotifRow {
  id: string;
  title: string;
  body: string;
  category: string;
  is_read: number;
  created_at: string;
}

export function AlertCenterView() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    eafClient
      .get<AlertRow[]>("/alerts", { params: { acknowledged: false } })
      .then(({ data }) => setAlerts(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load alerts")));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <PageContainer title="Alert Center" description="Operational alerts requiring attention">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <SectionCard title={`Open alerts (${alerts.length})`}>
        {!alerts.length ? (
          <p className="text-sm text-muted-foreground">No open alerts.</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => (
              <div key={a.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{a.severity}</Badge>
                    <p className="font-medium">{a.title}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.heat_number ? `Heat ${a.heat_number} · ` : ""}
                    {a.created_at}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void eafClient.post(`/alerts/${a.id}/acknowledge`).then(load)}
                >
                  Acknowledge
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}

export function NotificationsView() {
  const [items, setItems] = useState<NotifRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    eafClient
      .get<NotifRow[]>("/notifications")
      .then(({ data }) => setItems(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load notifications")));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <PageContainer title="Notifications" description="Validation, recommendations, and system messages">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <SectionCard title={`Inbox (${items.length})`}>
        {!items.length ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((n) => (
              <div key={n.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.is_read ? (
                    <Button size="sm" variant="ghost" onClick={() => void eafClient.post(`/notifications/${n.id}/read`).then(load)}>
                      Mark read
                    </Button>
                  ) : (
                    <Badge variant="outline">Read</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.created_at}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </PageContainer>
  );
}
