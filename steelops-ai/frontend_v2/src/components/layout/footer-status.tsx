"use client";

import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { useConnectionStatus } from "@/hooks/use-connection-status";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { StatusBadge } from "@/components/data-display/status-badge";

export function FooterStatus() {
  const online = useOnlineStatus();
  const { isOnline, isReconnecting, latencyMs } = useConnectionStatus();

  return (
    <footer className="flex h-10 items-center justify-between border-t border-border px-4 text-xs text-muted-foreground md:px-6">
      <span>
        {APP_NAME} v{APP_VERSION}
      </span>
      <div className="flex items-center gap-3">
        <span>API {online ? "✓" : "✗"}</span>
        <StatusBadge status={isOnline ? "online" : isReconnecting ? "reconnecting" : "offline"} />
        {latencyMs ? <span>{latencyMs}ms</span> : null}
      </div>
    </footer>
  );
}
