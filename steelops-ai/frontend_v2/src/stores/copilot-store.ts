import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PortfolioSlot =
  | "recommended"
  | "top_fast"
  | "top_balanced"
  | "top_safest"
  | "top_cheapest"
  | "top_conservative";

interface CopilotState {
  activeHeatId: string | null;
  selectedPortfolio: PortfolioSlot;
  simulationProgress: number;
  chatOpen: boolean;
  setActiveHeatId: (heatId: string | null) => void;
  setSelectedPortfolio: (slot: PortfolioSlot) => void;
  setSimulationProgress: (value: number) => void;
  setChatOpen: (open: boolean) => void;
}

export const useCopilotStore = create<CopilotState>()(
  persist(
    (set) => ({
      activeHeatId: null,
      selectedPortfolio: "recommended",
      simulationProgress: 1,
      chatOpen: false,
      setActiveHeatId: (activeHeatId) => set({ activeHeatId }),
      setSelectedPortfolio: (selectedPortfolio) => set({ selectedPortfolio, simulationProgress: 1 }),
      setSimulationProgress: (simulationProgress) => set({ simulationProgress }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
    }),
    { name: "steelops-copilot-v2" }
  )
);
