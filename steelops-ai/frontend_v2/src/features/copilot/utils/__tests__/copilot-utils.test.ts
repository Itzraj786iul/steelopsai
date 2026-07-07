import {
  answerCopilotQuestion,
  createChatMessage,
} from "@/features/copilot/utils/copilot-chat-engine";
import {
  buildPortfolioView,
  interpolateTwinValue,
  resolvePortfolioSlot,
  timelineProgress,
} from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";

const mockPkg = {
  package_id: "pkg-1",
  predicted_heat_time_min: 32,
  target_heat_time_min: 30,
  minutes_to_save: 2,
  planned_recipe: { HM: 58, DRI: 54, CPC: 545, LIME: 11, DOLO: 1, Bucket: 12 },
  recommended_optimized_recipe: { HM: 60, DRI: 52, CPC: 540, LIME: 11, DOLO: 1, Bucket: 12 },
  alternative_recipes: [{ portfolio_slot: "top_fast", predicted_heat_time_min: 29.5, expected_at_reduction_min: 2.5, confidence: "HIGH" }],
  digital_twin_comparison: { comparison_id: "twin-1", recommendation: "Proceed" },
  expected_GREEN_probability_pct: 88,
  expected_POWER: 42000,
  confidence_tier: "HIGH",
  confidence_score: 91,
  engineering_reasoning: "Reduce DRI and tune CPC for faster refine.",
  root_cause: "Extended refine stage from high DRI charge.",
  operator_actions: ["Adjust DRI", "Confirm ladle"],
  approval_requirements: "Shift incharge",
  business_value_inr: 1500,
  learning_references: [{ description: "Similar heats saved 1.8 min", support_heats: 120, avg_realised_improvement_min: 1.8, confidence: "HIGH" }],
  engine_trace: [],
  validation_errors: [],
  copilot_ready: true,
  grade: "EAF-Carbon-Standard",
  shift: "A",
} as unknown as PreheatDecisionPackage;

describe("copilot-utils", () => {
  it("interpolates twin values", () => {
    expect(interpolateTwinValue(10, 20, 0.5)).toBe(15);
    expect(interpolateTwinValue(10, 20, 0)).toBe(10);
    expect(interpolateTwinValue(10, 20, 1)).toBe(20);
  });

  it("builds recommended portfolio view", () => {
    const view = buildPortfolioView(mockPkg, "recommended");
    expect(view.label).toBe("Recommended");
    expect(view.minutesToSave).toBe(2);
  });

  it("resolves portfolio slots safely", () => {
    expect(resolvePortfolioSlot("top_fast")).toBe("top_fast");
    expect(resolvePortfolioSlot("invalid")).toBe("recommended");
  });

  it("computes timeline progress", () => {
    expect(timelineProgress(mockPkg)).toBeGreaterThanOrEqual(6);
  });
});

describe("copilot-chat-engine", () => {
  it("creates chat messages", () => {
    const message = createChatMessage("user", "Hello");
    expect(message.role).toBe("user");
    expect(message.content).toBe("Hello");
  });

  it("answers DRI questions from orchestrator context", () => {
    const portfolio = buildPortfolioView(mockPkg, "recommended");
    const answer = answerCopilotQuestion("What if I reduce DRI?", { pkg: mockPkg, portfolio });
    expect(answer.toLowerCase()).toContain("dri");
  });

  it("answers savings questions", () => {
    const portfolio = buildPortfolioView(mockPkg, "recommended");
    const answer = answerCopilotQuestion("Can I save one minute?", { pkg: mockPkg, portfolio });
    expect(answer.toLowerCase()).toMatch(/min|minute|recover/);
  });
});
