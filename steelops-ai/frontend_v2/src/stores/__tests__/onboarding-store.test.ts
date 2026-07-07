import { act } from "@testing-library/react";

import { useOnboardingStore } from "@/stores/onboarding-store";

describe("onboarding-store", () => {
  beforeEach(() => {
    act(() => useOnboardingStore.getState().resetOnboarding());
  });

  it("needs welcome on fresh state", () => {
    expect(useOnboardingStore.getState().needsWelcome()).toBe(true);
  });

  it("completes welcome flow", () => {
    act(() => useOnboardingStore.getState().completeWelcome());
    expect(useOnboardingStore.getState().needsWelcome()).toBe(false);
    expect(useOnboardingStore.getState().welcomeCompleted).toBe(true);
  });

  it("persists wizard installation config", () => {
    act(() => {
      useOnboardingStore.getState().updateInstallation({ plantName: "Test Plant", furnaces: 2 });
      useOnboardingStore.getState().completeWizard();
    });
    expect(useOnboardingStore.getState().installation.plantName).toBe("Test Plant");
    expect(useOnboardingStore.getState().wizardCompleted).toBe(true);
  });

  it("tracks training progress and badges", () => {
    act(() => {
      useOnboardingStore.getState().setTrainingProgress("op-basics", 100);
      useOnboardingStore.getState().awardBadge("op-basics");
    });
    expect(useOnboardingStore.getState().trainingProgress["op-basics"]).toBe(100);
    expect(useOnboardingStore.getState().trainingBadges).toContain("op-basics");
  });
});
