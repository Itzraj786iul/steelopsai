/**
 * Rewrite API / legacy validation strings that still use metallurgy codes
 * (HM, DRI, P5–P95) into everyday language for visitors.
 */

const REPLACEMENTS: [RegExp | string, string][] = [
  [/historical distribution \(P5[–-]P95\)/gi, "the common plant range"],
  [/historical operating range \(P5[–-]P95[^)]*\)/gi, "the common plant range"],
  [/P5[–-]P95/gi, "common plant range"],
  [/historical P95/gi, "the usual high end for this plant"],
  [/historical P5/gi, "the usual low end for this plant"],
  [/95th percentile/gi, "usual high end"],
  [/5th percentile/gi, "usual low end"],
  [/\bDOLO\b/g, "Dolomite (flux)"],
  [/\bLIME\b/g, "Lime (flux)"],
  [/\bHBI\b/g, "Hot briquetted iron (HBI)"],
  [/\bDRI\b/g, "Direct reduced iron (DRI)"],
  [/\bHM\b/g, "Hot metal (HM)"],
  [/\bCPC\b/g, "Carbon program"],
  [/\bOXY\b/g, "Oxygen program"],
  [/\bPOWER\b/g, "Electrical energy"],
  [/Predictions may have lower confidence/gi, "The prediction may be less certain"],
  [/Prediction uncertainty may be higher/gi, "The prediction may be less certain"],
];

export function humanizeWarning(message: string): string {
  let out = message;
  for (const [from, to] of REPLACEMENTS) {
    out = typeof from === "string" ? out.split(from).join(to) : out.replace(from, to);
  }
  return out;
}

export function humanizeWarnings(messages: string[]): string[] {
  return messages.map(humanizeWarning);
}
