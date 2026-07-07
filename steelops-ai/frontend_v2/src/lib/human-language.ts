/** Plain-language labels for operators — engineering terms on demand only */

export const HUMAN_TERMS: Record<string, string> = {
  AT: "Heat time",
  "P ": "Phosphorus",
  P: "Phosphorus",
  F2: "Phosphorus risk",
  GREEN: "Energy efficiency",
  DRI: "Direct reduced iron",
  HM: "Hot metal",
  CPC: "Carbon paste",
  OXY: "Oxygen",
  "T C": "Charge temperature",
  "prediction confidence": "How certain is AI?",
  "confidence tier": "How certain is AI?",
  SIFM: "SteelOps foundation model",
};

export type DecisionMode = "operator" | "shift_incharge" | "plant_manager" | "executive";

export const DECISION_MODE_LABELS: Record<DecisionMode, string> = {
  operator: "Operator",
  shift_incharge: "Shift Incharge",
  plant_manager: "Plant Manager",
  executive: "Executive",
};

export function humanize(term: string, engineering = false): string {
  if (engineering) return term;
  const key = term.trim();
  return HUMAN_TERMS[key] ?? HUMAN_TERMS[key.toLowerCase()] ?? term;
}

export function greetingName(fullName?: string | null): string {
  if (!fullName) return "there";
  return fullName.split(" ")[0] ?? fullName;
}

export function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
