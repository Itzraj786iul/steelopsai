import {
  diffRecipes,
  formatPortfolioLabel,
  heatToIntelligenceRequest,
  recipeFingerprint,
  sortPortfolio,
} from "@/features/preheat/utils/preheat-utils";
import type { AlternativeRecipe, PreheatDecisionPackage } from "@/types/preheat.types";

describe("preheat-utils", () => {
  it("builds intelligence request from heat recipe", () => {
    const request = heatToIntelligenceRequest(
      { HM: 60, DRI: 50, CPC: 540, LIME: 10, DOLO: 1, "T C": 115, Bucket: 12 },
      { shift: "A", heatId: "heat-1", grade: "EAF-Carbon-Standard" }
    );
    expect(request.HM).toBe(60);
    expect(request.heat_id).toBe("heat-1");
    expect(request.Shift).toBe("A");
  });

  it("formats recipe fingerprint", () => {
    expect(recipeFingerprint({ HM: 60, DRI: 40, CPC: 540 })).toContain("HM");
    expect(recipeFingerprint({ HM: 60, DRI: 40, CPC: 540 })).toContain("DRI");
  });

  it("diffs recipes with non-zero deltas only", () => {
    const baseline = { HM: 58, DRI: 54, CPC: 545, LIME: 11, DOLO: 1, HBI: 0, "T C": 120, Bucket: 12 };
    const candidate = { HM: 60, DRI: 54, CPC: 545, LIME: 11, DOLO: 1, HBI: 0, "T C": 120, Bucket: 12 };
    const diff = diffRecipes(baseline, candidate);
    expect(diff.some((row) => row.key === "HM")).toBe(true);
    expect(diff.some((row) => row.key === "DRI")).toBe(false);
  });

  it("sorts portfolio by strategy slot", () => {
    const alternatives: AlternativeRecipe[] = [
      { portfolio_slot: "top_conservative", candidate_id: "c1" },
      { portfolio_slot: "top_fast", candidate_id: "c2" },
      { portfolio_slot: "top_balanced", candidate_id: "c3" },
    ];
    const sorted = sortPortfolio(alternatives);
    expect(sorted[0].portfolio_slot).toBe("top_fast");
    expect(formatPortfolioLabel(sorted[0])).toBe("Fast");
  });

  it("summarizes package metrics", () => {
    const pkg = {
      package_id: "pkg-1",
      predicted_heat_time_min: 32,
      target_heat_time_min: 30,
      minutes_to_save: 2,
      confidence_tier: "HIGH",
      confidence_score: 91,
      business_value_inr: 1500,
    } as PreheatDecisionPackage;
    expect(pkg.minutes_to_save).toBe(2);
    expect(pkg.business_value_inr).toBe(1500);
  });
});
