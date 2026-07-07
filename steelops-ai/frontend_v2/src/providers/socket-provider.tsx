"use client";

import { useEffect } from "react";

import { realtimeService } from "@/services/websocket";
import { getAccessToken } from "@/services/api-client";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!getAccessToken()) return;
    realtimeService.connect("/api/v1/ws/live-heats");
    return () => realtimeService.disconnect();
  }, []);

  return <>{children}</>;
}
