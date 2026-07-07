import { create } from "zustand";
import { persist } from "zustand/middleware";

import { SHIFTS } from "@/lib/constants";

export interface InstallationConfig {
  plantName: string;
  furnaces: number;
  shifts: (typeof SHIFTS)[number][];
  materials: string[];
  targetHeatTimeMin: number;
  businessGoals: string[];
  integrations: string[];
}

const defaultInstallation: InstallationConfig = {
  plantName: "JSPL Angul",
  furnaces: 3,
  shifts: ["A", "B", "C"],
  materials: ["DRI", "Scrap", "Lime", "Ferro alloys"],
  targetHeatTimeMin: 52,
  businessGoals: ["Reduce heat time", "Increase GREEN %", "Lower power cost"],
  integrations: [],
};

interface OnboardingState {
  welcomeCompleted: boolean;
  wizardCompleted: boolean;
  wizardStep: number;
  installation: InstallationConfig;
  tourCompleted: boolean;
  tourActive: boolean;
  tourStep: number;
  trainingProgress: Record<string, number>;
  trainingBadges: string[];
  completeWelcome: () => void;
  skipWelcome: () => void;
  setWizardStep: (step: number) => void;
  updateInstallation: (patch: Partial<InstallationConfig>) => void;
  completeWizard: () => void;
  startTour: () => void;
  stopTour: () => void;
  setTourStep: (step: number) => void;
  completeTour: () => void;
  setTrainingProgress: (pathId: string, percent: number) => void;
  awardBadge: (badgeId: string) => void;
  resetOnboarding: () => void;
  needsWelcome: () => boolean;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      welcomeCompleted: false,
      wizardCompleted: false,
      wizardStep: 0,
      installation: defaultInstallation,
      tourCompleted: false,
      tourActive: false,
      tourStep: 0,
      trainingProgress: {},
      trainingBadges: [],
      completeWelcome: () => set({ welcomeCompleted: true }),
      skipWelcome: () => set({ welcomeCompleted: true }),
      setWizardStep: (wizardStep) => set({ wizardStep }),
      updateInstallation: (patch) =>
        set((s) => ({ installation: { ...s.installation, ...patch } })),
      completeWizard: () => set({ wizardCompleted: true, wizardStep: 0 }),
      startTour: () => set({ tourActive: true, tourStep: 0 }),
      stopTour: () => set({ tourActive: false }),
      setTourStep: (tourStep) => set({ tourStep }),
      completeTour: () => set({ tourCompleted: true, tourActive: false }),
      setTrainingProgress: (pathId, percent) =>
        set((s) => ({
          trainingProgress: { ...s.trainingProgress, [pathId]: percent },
        })),
      awardBadge: (badgeId) =>
        set((s) => ({
          trainingBadges: s.trainingBadges.includes(badgeId)
            ? s.trainingBadges
            : [...s.trainingBadges, badgeId],
        })),
      resetOnboarding: () =>
        set({
          welcomeCompleted: false,
          wizardCompleted: false,
          wizardStep: 0,
          installation: defaultInstallation,
          tourCompleted: false,
          tourActive: false,
          tourStep: 0,
          trainingProgress: {},
          trainingBadges: [],
        }),
      needsWelcome: () => !get().welcomeCompleted,
    }),
    { name: "steelops-onboarding-v1" }
  )
);
