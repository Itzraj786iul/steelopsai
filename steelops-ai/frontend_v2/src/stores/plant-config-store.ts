import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ExportFormat = "json" | "csv" | "pdf";
export type UnitSystem = "metric" | "imperial";

export interface PlantConfig {
  chargeMin: number;
  chargeMax: number;
  confidenceHighThreshold: number;
  confidenceLowThreshold: number;
  theme: "light" | "dark" | "system";
  unitSystem: UnitSystem;
  defaultExportFormat: ExportFormat;
  reportBranding: string;
  reportFooter: string;
}

const DEFAULT_CONFIG: PlantConfig = {
  chargeMin: 100,
  chargeMax: 160,
  confidenceHighThreshold: 70,
  confidenceLowThreshold: 50,
  theme: "system",
  unitSystem: "metric",
  defaultExportFormat: "json",
  reportBranding: "JSPL Raigarh SMS-3 EAF Tap-to-Tap Decision Support",
  reportFooter: "Confidential — JSPL Raigarh SMS-3 Operations Use Only",
};

interface PlantConfigState extends PlantConfig {
  setConfig: (patch: Partial<PlantConfig>) => void;
  resetConfig: () => void;
}

export const usePlantConfigStore = create<PlantConfigState>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,
      setConfig: (patch) => set((s) => ({ ...s, ...patch })),
      resetConfig: () => set({ ...DEFAULT_CONFIG }),
    }),
    { name: "jspl-plant-config", partialize: (s) => ({
      chargeMin: s.chargeMin,
      chargeMax: s.chargeMax,
      confidenceHighThreshold: s.confidenceHighThreshold,
      confidenceLowThreshold: s.confidenceLowThreshold,
      theme: s.theme,
      unitSystem: s.unitSystem,
      defaultExportFormat: s.defaultExportFormat,
      reportBranding: s.reportBranding,
      reportFooter: s.reportFooter,
    }) },
  )
);
