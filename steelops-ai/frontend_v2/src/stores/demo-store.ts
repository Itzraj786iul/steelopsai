import { create } from "zustand";

import type { DemoEvent, DemoScenario } from "@/features/onboarding/utils/demo-scenarios";
import { getScenarioById } from "@/features/onboarding/utils/demo-scenarios";

interface DemoState {
  active: boolean;
  scenarioId: string | null;
  playing: boolean;
  eventIndex: number;
  events: DemoEvent[];
  startedAt: number | null;
  startDemo: (scenarioId: string) => void;
  stopDemo: () => void;
  pauseDemo: () => void;
  resumeDemo: () => void;
  advanceEvent: () => void;
  getCurrentEvent: () => DemoEvent | null;
  getScenario: () => DemoScenario | null;
}

export const useDemoStore = create<DemoState>()((set, get) => ({
  active: false,
  scenarioId: null,
  playing: false,
  eventIndex: 0,
  events: [],
  startedAt: null,
  startDemo: (scenarioId) => {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) return;
    set({
      active: true,
      scenarioId,
      playing: true,
      eventIndex: 0,
      events: scenario.events,
      startedAt: Date.now(),
    });
  },
  stopDemo: () =>
    set({
      active: false,
      scenarioId: null,
      playing: false,
      eventIndex: 0,
      events: [],
      startedAt: null,
    }),
  pauseDemo: () => set({ playing: false }),
  resumeDemo: () => set({ playing: true }),
  advanceEvent: () => {
    const { eventIndex, events } = get();
    if (eventIndex >= events.length - 1) {
      set({ playing: false });
      return;
    }
    set({ eventIndex: eventIndex + 1 });
  },
  getCurrentEvent: () => {
    const { events, eventIndex } = get();
    return events[eventIndex] ?? null;
  },
  getScenario: () => {
    const { scenarioId } = get();
    return scenarioId ? (getScenarioById(scenarioId) ?? null) : null;
  },
}));
