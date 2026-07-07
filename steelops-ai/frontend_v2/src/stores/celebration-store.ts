import { create } from "zustand";

export type CelebrationKind =
  | "target_achieved"
  | "approval_success"
  | "heat_completed"
  | "recommendation_accepted"
  | "learning_unlocked";

interface CelebrationState {
  active: CelebrationKind | null;
  message: string;
  trigger: (kind: CelebrationKind, message: string) => void;
  clear: () => void;
}

const MESSAGES: Record<CelebrationKind, string> = {
  target_achieved: "Target achieved — great work!",
  approval_success: "Recipe approved — ready to charge",
  heat_completed: "Heat completed — learning captured",
  recommendation_accepted: "Recommendation accepted",
  learning_unlocked: "New plant intelligence unlocked",
};

export const useCelebrationStore = create<CelebrationState>((set) => ({
  active: null,
  message: "",
  trigger: (kind, message) => set({ active: kind, message: message || MESSAGES[kind] }),
  clear: () => set({ active: null, message: "" }),
}));
