import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SIDEBAR_STORAGE_KEY } from "@/lib/constants";

interface SidebarState {
  collapsed: boolean;
  mobileOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setMobileOpen: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      mobileOpen: false,
      setCollapsed: (collapsed) => set({ collapsed }),
      toggleCollapsed: () => set({ collapsed: !get().collapsed }),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    {
      name: SIDEBAR_STORAGE_KEY,
      partialize: (state) => ({ collapsed: state.collapsed }),
    }
  )
);
