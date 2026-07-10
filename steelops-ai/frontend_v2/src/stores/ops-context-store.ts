import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OpsContextState {
  furnaceId: string;
  plant: string;
  shiftId: string | null;
  supervisorId: string | null;
  setFurnaceId: (id: string) => void;
  setPlant: (plant: string) => void;
  setShiftId: (id: string | null) => void;
  setSupervisorId: (id: string | null) => void;
}

export const useOpsContextStore = create<OpsContextState>()(
  persist(
    (set) => ({
      furnaceId: "EAF-1",
      plant: "JSPL",
      shiftId: null,
      supervisorId: null,
      setFurnaceId: (furnaceId) => set({ furnaceId }),
      setPlant: (plant) => set({ plant }),
      setShiftId: (shiftId) => set({ shiftId }),
      setSupervisorId: (supervisorId) => set({ supervisorId }),
    }),
    { name: "jspl-ops-context" }
  )
);
