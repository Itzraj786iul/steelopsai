import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { DecisionMode } from "@/lib/human-language";

interface DecisionModeState {
  mode: DecisionMode;
  focusMode: boolean;
  briefingDismissed: boolean;
  setMode: (mode: DecisionMode) => void;
  toggleFocusMode: () => void;
  setFocusMode: (on: boolean) => void;
  dismissBriefing: () => void;
  resetBriefing: () => void;
}

export const useDecisionModeStore = create<DecisionModeState>()(
  persist(
    (set, get) => ({
      mode: "operator",
      focusMode: false,
      briefingDismissed: false,
      setMode: (mode) => set({ mode }),
      toggleFocusMode: () => set({ focusMode: !get().focusMode }),
      setFocusMode: (focusMode) => set({ focusMode }),
      dismissBriefing: () => set({ briefingDismissed: true }),
      resetBriefing: () => set({ briefingDismissed: false }),
    }),
    { name: "steelops-decision-mode" }
  )
);

export function detailLevel(mode: DecisionMode): "minimal" | "standard" | "full" | "executive" {
  if (mode === "operator") return "minimal";
  if (mode === "shift_incharge") return "standard";
  if (mode === "plant_manager") return "full";
  return "executive";
}
