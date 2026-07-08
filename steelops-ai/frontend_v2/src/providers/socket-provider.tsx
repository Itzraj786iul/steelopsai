"use client";

import { useEffect } from "react";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // EAF product uses REST API only; legacy live-heat WebSocket is not required.
  useEffect(() => undefined, []);
  return <>{children}</>;
}
