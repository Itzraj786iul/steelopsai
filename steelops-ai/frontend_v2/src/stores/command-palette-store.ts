import { create } from "zustand";

interface CommandPaletteState {
  open: boolean;
  query: string;
  recent: string[];
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  addRecent: (item: string) => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  open: false,
  query: "",
  recent: [],
  setOpen: (open) => set({ open }),
  setQuery: (query) => set({ query }),
  addRecent: (item) => {
    const recent = [item, ...get().recent.filter((entry) => entry !== item)].slice(0, 8);
    set({ recent });
  },
}));
