import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NavRecentState {
  recent: string[];
  pinned: string[];
  addRecent: (href: string) => void;
  togglePin: (href: string) => void;
}

export const useNavRecentStore = create<NavRecentState>()(
  persist(
    (set, get) => ({
      recent: [],
      pinned: ["/eaf/prediction", "/eaf/optimizer", "/eaf/validation"],
      addRecent: (href) => {
        if (href === "/" || href.startsWith("/login")) return;
        const recent = [href, ...get().recent.filter((e) => e !== href)].slice(0, 6);
        set({ recent });
      },
      togglePin: (href) => {
        const { pinned } = get();
        set({
          pinned: pinned.includes(href) ? pinned.filter((p) => p !== href) : [...pinned, href].slice(0, 6),
        });
      },
    }),
    { name: "steelops-nav-recent" }
  )
);
