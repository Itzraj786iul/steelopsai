import { recipeDeltas } from "@/features/copilot/utils/copilot-utils";
import type { PortfolioView } from "@/features/copilot/utils/copilot-utils";
import type { PreheatDecisionPackage } from "@/types/preheat.types";
import type { Heat } from "@/types/heat.types";

export interface CopilotChatContext {
  pkg: PreheatDecisionPackage;
  portfolio: PortfolioView;
  heat?: Heat | null;
}

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function createChatMessage(role: CopilotChatMessage["role"], content: string): CopilotChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function answerCopilotQuestion(question: string, context: CopilotChatContext): string {
  const q = question.toLowerCase().trim();
  const { pkg, portfolio } = context;
  const deltas = recipeDeltas(pkg, portfolio);

  if (q.includes("dri") && (q.includes("reduce") || q.includes("what if") || q.includes("lower"))) {
    const driDelta = deltas.find((row) => row.key === "DRI");
    const change = driDelta?.delta ?? 0;
    if (change < 0) {
      return `Reducing DRI by ${Math.abs(change).toFixed(1)} t is already in the ${portfolio.label} recommendation. Expected AT ${portfolio.targetAt.toFixed(1)} min with ${portfolio.confidenceTier} confidence. ${portfolio.reasoning.slice(0, 200)}…`;
    }
    return `Current plan DRI ${Number(pkg.planned_recipe.DRI).toFixed(1)} t. Copilot recommends ${Number(portfolio.recipe.DRI).toFixed(1)} t. Lower DRI can shorten melt but increases CPC sensitivity — review warnings before charge.`;
  }

  if (q.includes("save") && (q.includes("minute") || q.includes("min"))) {
    const save = portfolio.minutesToSave;
    return save >= 1
      ? `Yes — ${portfolio.label} recovers ${save.toFixed(1)} min (predicted ${portfolio.predictedAt.toFixed(1)} → target ${portfolio.targetAt.toFixed(1)} min). Business impact ≈ ₹${portfolio.businessValueInr.toLocaleString("en-IN")}.`
      : `Current package shows ${save.toFixed(2)} min recoverable. Try the Fast portfolio slot or refresh after schedule update.`;
  }

  if (q.includes("cpc") && q.includes("high")) {
    const cpc = Number(portfolio.recipe.CPC ?? pkg.planned_recipe.CPC);
    return `CPC at ${cpc.toFixed(0)} kg is driven by ${pkg.root_cause}. Engineering note: ${pkg.engineering_reasoning.slice(0, 240)}…`;
  }

  if (q.includes("similar") && q.includes("heat")) {
    const refs = pkg.learning_references.slice(0, 3);
    if (!refs.length) return "No learning references attached to this package.";
    return refs
      .map(
        (ref) =>
          `• ${ref.description ?? "Lesson"} — ${ref.support_heats?.toLocaleString() ?? 0} heats, avg ${ref.avg_realised_improvement_min?.toFixed(2) ?? "—"} min (${ref.confidence ?? "MEDIUM"})`
      )
      .join("\n");
  }

  if (q.includes("confidence") && (q.includes("low") || q.includes("why"))) {
    return `Confidence is ${portfolio.confidenceTier} (${portfolio.confidenceScore.toFixed(1)}%). Factors: ${pkg.validation_errors.length ? pkg.validation_errors.join("; ") : "validation clear"}, twin recommendation: ${pkg.digital_twin_comparison.recommendation ?? "proceed"}. ${pkg.approval_requirements}`;
  }

  if (q.includes("approve") || q.includes("risk")) {
    return `Approval requirement: ${pkg.approval_requirements}. Warnings: ${[...portfolio.warnings, ...pkg.validation_errors].join(" · ") || "none"}.`;
  }

  return `Based on orchestrator output: predicted ${portfolio.predictedAt.toFixed(1)} min, target ${portfolio.targetAt.toFixed(1)} min, ${portfolio.minutesToSave.toFixed(1)} min recoverable. Ask about DRI, CPC, savings, similar heats, or confidence.`;
}
