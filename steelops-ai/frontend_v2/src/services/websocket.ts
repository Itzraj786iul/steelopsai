"use client";

import { getAccessToken, getWsBaseUrl } from "@/services/api-client";
import { ConnectionStatus } from "@/lib/enums";
import { useRealtimeStore } from "@/stores/realtime-store";
import type { WsMessage } from "@/types";

type MessageHandler = (message: WsMessage) => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pingSentAt: number | null = null;
  private reconnectAttempt = 0;
  private handlers = new Set<MessageHandler>();
  private enabled = false;
  private currentPath = "/api/v1/ws/live-heats";

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  connect(path = "/api/v1/ws/live-heats"): void {
    if (typeof window === "undefined") return;
    this.enabled = true;
    this.currentPath = path;
    this.open(path);
  }

  connectHeat(heatId: string): void {
    this.connect(`/api/v1/ws/heat/${heatId}`);
  }

  connectLiveHeats(): void {
    this.connect("/api/v1/ws/live-heats");
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  disconnect(): void {
    this.enabled = false;
    this.clearTimers();
    this.ws?.close();
    this.ws = null;
    useRealtimeStore.getState().setStatus(ConnectionStatus.Offline);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private open(path: string): void {
    const token = getAccessToken();
    if (!token) {
      useRealtimeStore.getState().setStatus(ConnectionStatus.Offline);
      return;
    }

    this.clearTimers();
    this.ws?.close();

    useRealtimeStore.getState().setStatus(ConnectionStatus.Reconnecting);
    const url = `${getWsBaseUrl()}${path}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectAttempt = 0;
      useRealtimeStore.getState().setStatus(ConnectionStatus.Online);
      useRealtimeStore.getState().setLastSyncAt(new Date().toISOString());

      this.heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          this.pingSentAt = Date.now();
          ws.send(JSON.stringify({ type: "ping", timestamp: new Date().toISOString() }));
        }
      }, 30_000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        if (message.type === "pong" && this.pingSentAt) {
          useRealtimeStore.getState().setLatencyMs(Date.now() - this.pingSentAt);
          this.pingSentAt = null;
          return;
        }
        useRealtimeStore.getState().setLastSyncAt(new Date().toISOString());
        this.handlers.forEach((handler) => handler(message));
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      useRealtimeStore.getState().setStatus(ConnectionStatus.Offline);
      this.clearTimers();
      if (!this.enabled) return;

      this.reconnectAttempt += 1;
      const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.reconnectAttempt, 5));
      this.reconnectTimer = setTimeout(() => this.open(this.currentPath), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }
}

export const realtimeService = new RealtimeService();
