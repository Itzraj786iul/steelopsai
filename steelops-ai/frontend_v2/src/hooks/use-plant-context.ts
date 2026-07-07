"use client";

import { PLANTS, SHIFTS } from "@/lib/constants";
import { usePlantStore } from "@/stores/plant-store";

export function usePlantContext() {
  const { plantId, shift, setPlantId, setShift } = usePlantStore();
  const plant = PLANTS.find((entry) => entry.id === plantId) ?? PLANTS[0];

  return {
    plantId,
    plant,
    shift,
    shifts: SHIFTS,
    setPlantId,
    setShift,
  };
}
