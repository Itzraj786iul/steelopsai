import { create } from "zustand";

import type { NotificationItem } from "@/types";

interface NotificationState {
  items: NotificationItem[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  setItems: (items: NotificationItem[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  addItem: (item: NotificationItem) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setItems: (items) => set({ items }),
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    })),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
    })),
  addItem: (item) =>
    set((state) => ({
      items: [item, ...state.items.filter((existing) => existing.id !== item.id)].slice(0, 100),
    })),
  unreadCount: () => get().items.filter((item) => !item.read).length,
}));
