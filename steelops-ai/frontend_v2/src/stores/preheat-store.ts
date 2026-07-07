import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { PreheatDecisionPackage } from "@/types/preheat.types";

interface PreheatState {
  activePackage: PreheatDecisionPackage | null;
  activeHeatId: string | null;
  setActivePackage: (pkg: PreheatDecisionPackage | null, heatId?: string | null) => void;
  clearPackage: () => void;
}

export const usePreheatStore = create<PreheatState>()(
  persist(
    (set) => ({
      activePackage: null,
      activeHeatId: null,
      setActivePackage: (activePackage, activeHeatId = null) => set({ activePackage, activeHeatId }),
      clearPackage: () => set({ activePackage: null, activeHeatId: null }),
    }),
    { name: "steelops-preheat-v2" }
  )
);
