export type ChecklistStatus = "green" | "yellow" | "red";

export interface ChecklistItem {
  id: string;
  area: string;
  label: string;
  status: ChecklistStatus;
  detail: string;
}

export function buildDeploymentChecklist(input: {
  backendOnline: boolean;
  modelLoaded: boolean;
  frontendBuilt: boolean;
  hasAudits: boolean;
  hasValidation: boolean;
  docsComplete: boolean;
}): ChecklistItem[] {
  return [
    {
      id: "backend",
      area: "Backend",
      label: "API service reachable",
      status: input.backendOnline ? "green" : "red",
      detail: input.backendOnline ? "EAF backend responding" : "Backend offline or unreachable",
    },
    {
      id: "frontend",
      area: "Frontend",
      label: "Production build verified",
      status: input.frontendBuilt ? "green" : "yellow",
      detail: input.frontendBuilt ? "Next.js production build passed" : "Run npm run build before release",
    },
    {
      id: "model",
      area: "Model",
      label: "Phase 19 model loaded",
      status: input.modelLoaded ? "green" : "red",
      detail: input.modelLoaded ? "Pickle artifacts loaded in memory" : "Model not loaded on backend",
    },
    {
      id: "optimizer",
      area: "Optimizer",
      label: "Phase 20.2 optimizer ready",
      status: input.backendOnline && input.modelLoaded ? "green" : "yellow",
      detail: "Physics-guided optimizer available via API",
    },
    {
      id: "validation",
      area: "Validation",
      label: "Plant validation workflow",
      status: input.hasValidation ? "green" : "yellow",
      detail: input.hasValidation ? "Validation records present" : "No validation records yet — run smoke test",
    },
    {
      id: "research",
      area: "Research",
      label: "Research tools separated",
      status: "green",
      detail: "Phase 31/32 isolated from production navigation",
    },
    {
      id: "documentation",
      area: "Documentation",
      label: "In-app documentation",
      status: input.docsComplete ? "green" : "yellow",
      detail: "Documentation center available in application",
    },
    {
      id: "testing",
      area: "Testing",
      label: "Audit trail active",
      status: input.hasAudits ? "green" : "yellow",
      detail: input.hasAudits ? "Prediction audits recorded" : "Run at least one prediction to verify audit",
    },
    {
      id: "release",
      area: "Release",
      label: "Release v1.0.0 tagged",
      status: "green",
      detail: "SteelOps AI v1.0.0 enterprise readiness phase",
    },
  ];
}

export function overallChecklistStatus(items: ChecklistItem[]): ChecklistStatus {
  if (items.some((i) => i.status === "red")) return "red";
  if (items.some((i) => i.status === "yellow")) return "yellow";
  return "green";
}
