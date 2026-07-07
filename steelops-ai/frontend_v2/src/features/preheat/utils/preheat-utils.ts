import type {
  AlternativeRecipe,
  PreheatDecisionPackage,
  PreheatIntelligenceRequest,
  RecipeRecord,
} from "@/types/preheat.types";

export const RECIPE_KEYS = ["HM", "DRI", "CPC", "LIME", "DOLO", "HBI", "T C", "Bucket"] as const;

export const PORTFOLIO_ORDER = [
  { slot: "top_fast", label: "Fast" },
  { slot: "top_balanced", label: "Balanced" },
  { slot: "top_safest", label: "Safe" },
  { slot: "top_cheapest", label: "Cheapest" },
  { slot: "top_conservative", label: "Conservative" },
] as const;

export function alternativeToRecipe(alt: AlternativeRecipe): RecipeRecord {
  return {
    HM: Number(alt.recipe_HM ?? 0),
    DRI: Number(alt.recipe_DRI ?? 0),
    CPC: Number(alt.recipe_CPC ?? 0),
    LIME: Number(alt.recipe_LIME ?? 0),
    DOLO: Number(alt.recipe_DOLO ?? 0),
    HBI: Number(alt.recipe_HBI ?? 0),
    "T C": Number(alt.recipe_T_C ?? 0),
  };
}

export function recipeFingerprint(recipe: RecipeRecord): string {
  const hm = Number(recipe.HM ?? 0);
  const dri = Number(recipe.DRI ?? 0);
  const total = hm + dri || 1;
  return `HM ${((hm / total) * 100).toFixed(0)}% · DRI ${((dri / total) * 100).toFixed(0)}% · CPC ${recipe.CPC ?? "—"}`;
}

export function confidenceVariant(tier: string): "success" | "warning" | "destructive" {
  const normalized = tier.toUpperCase();
  if (normalized === "HIGH") return "success";
  if (normalized === "MEDIUM") return "warning";
  return "destructive";
}

export function diffRecipes(
  baseline: RecipeRecord,
  candidate: RecipeRecord
): Array<{ key: string; baseline: number; candidate: number; delta: number }> {
  return RECIPE_KEYS.map((key) => {
    const base = Number(baseline[key] ?? 0);
    const cand = Number(candidate[key] ?? 0);
    return { key, baseline: base, candidate: cand, delta: cand - base };
  }).filter((row) => Math.abs(row.delta) > 0.01);
}

export function heatToIntelligenceRequest(
  recipe: Record<string, unknown>,
  meta: { shift?: string | null; grade?: string; heatId?: string; plannedStart?: string | null }
): PreheatIntelligenceRequest {
  return {
    HM: Number(recipe.HM ?? 58.5),
    DRI: Number(recipe.DRI ?? 54),
    CPC: Number(recipe.CPC ?? 545),
    LIME: Number(recipe.LIME ?? 11.4),
    DOLO: Number(recipe.DOLO ?? 1.2),
    HBI: Number(recipe.HBI ?? 0),
    T_C: Number(recipe["T C"] ?? recipe.T_C ?? 120),
    Bucket: Number(recipe.Bucket ?? 12),
    Shift: meta.shift ?? "C1",
    Grade: meta.grade ?? "EAF-Carbon-Standard",
    planned_start_time: meta.plannedStart ?? "",
    heat_id: meta.heatId,
  };
}

export function packageSummary(pkg: PreheatDecisionPackage) {
  return {
    id: pkg.package_id,
    predicted: pkg.predicted_heat_time_min,
    target: pkg.target_heat_time_min,
    save: pkg.minutes_to_save,
    confidence: pkg.confidence_tier,
    score: pkg.confidence_score,
    businessValue: pkg.business_value_inr,
  };
}

export function sortPortfolio(alternatives: AlternativeRecipe[]): AlternativeRecipe[] {
  const order: string[] = PORTFOLIO_ORDER.map((p) => p.slot);
  return [...alternatives].sort((a, b) => {
    const ai = order.indexOf(String(a.portfolio_slot));
    const bi = order.indexOf(String(b.portfolio_slot));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

export function formatPortfolioLabel(alt: AlternativeRecipe): string {
  const match = PORTFOLIO_ORDER.find((p) => p.slot === alt.portfolio_slot);
  return match?.label ?? alt.portfolio_label ?? "Alternative";
}
