import {
  APP_VERSION,
  DATASET_VERSION,
  OPTIMIZER_PHASE,
  PRODUCTION_MODEL_PHASE,
  RESEARCH_VERSION,
} from "@/lib/constants";

export const HYBRID_ENGINE_PHASE = "Phase 32";
export const RESEARCH_OPTIMIZER_PHASE = "Phase 31";
export const DATASET_PHASE = "Phase 16";
export const BUILD_DATE = process.env.NEXT_PUBLIC_BUILD_DATE ?? "2026-07-10";
export const GIT_COMMIT = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "v1.0.0-release";

export interface VersionRow {
  component: string;
  version: string;
  status: "production" | "research" | "platform";
}

export const VERSION_REGISTRY: VersionRow[] = [
  { component: "Application", version: `v${APP_VERSION}`, status: "platform" },
  { component: "Prediction Model", version: PRODUCTION_MODEL_PHASE, status: "production" },
  { component: "Optimizer", version: OPTIMIZER_PHASE, status: "production" },
  { component: "Research Optimizer", version: RESEARCH_OPTIMIZER_PHASE, status: "research" },
  { component: "Hybrid Engine", version: HYBRID_ENGINE_PHASE, status: "research" },
  { component: "Dataset", version: DATASET_PHASE, status: "production" },
  { component: "Frontend", version: `v${APP_VERSION}`, status: "platform" },
  { component: "Backend", version: `v${APP_VERSION}`, status: "platform" },
  { component: "Research Integration", version: RESEARCH_VERSION, status: "research" },
  { component: "Dataset Label", version: DATASET_VERSION, status: "production" },
];
