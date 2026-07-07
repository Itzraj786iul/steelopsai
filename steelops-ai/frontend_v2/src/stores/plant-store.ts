import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEFAULT_PLANT_SLUG, PLANT_STORAGE_KEY, SHIFTS } from "@/lib/constants";

interface PlantState {
  plantId: string;
  shift: (typeof SHIFTS)[number];
  setPlantId: (plantId: string) => void;
  setShift: (shift: (typeof SHIFTS)[number]) => void;
}

export const usePlantStore = create<PlantState>()(
  persist(
    (set) => ({
      plantId: DEFAULT_PLANT_SLUG,
      shift: "A",
      setPlantId: (plantId) => set({ plantId }),
      setShift: (shift) => set({ shift }),
    }),
    { name: PLANT_STORAGE_KEY }
  )
);
