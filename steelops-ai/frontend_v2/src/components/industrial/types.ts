export interface VizDatum {
  label: string;
  value: number;
  unit?: string;
  color?: string;
}

export interface FlowStep {
  id: string;
  label: string;
  value?: string;
  status?: "complete" | "active" | "pending" | "warning";
  description?: string;
}

export interface SimilarHeatNode {
  id: string;
  label: string;
  distance: number;
  outcome: string;
  recipe: string;
  greenProbability: number;
}

export interface ShapDriver {
  feature: string;
  impact: number;
  direction?: "positive" | "negative";
}

export interface RecipeDeltaRow {
  key: string;
  baseline: number;
  candidate: number;
  delta: number;
}

export interface ReasoningNode {
  id: string;
  label: string;
  body: string;
  kind: "variable" | "mechanism" | "stage" | "impact" | "action";
}
