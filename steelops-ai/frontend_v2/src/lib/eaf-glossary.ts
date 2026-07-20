/**
 * Plain-language industrial glossary + input guidance.
 * Technical codes stay for APIs; UI should prefer `plain` + `hint`.
 */

export interface GlossaryTerm {
  /** Short code shown in UI (e.g. TTT) */
  code: string;
  /** Everyday title */
  plain: string;
  /** One-sentence explanation */
  meaning: string;
  /** Optional example for visitors */
  example?: string;
}

export interface FieldGuide {
  key: string;
  /** Everyday name first */
  plain: string;
  /** Metallurgy / plant code */
  code: string;
  unit: string;
  /** Why this input matters */
  why: string;
  /** What a sensible value looks like */
  typical: string;
  /** Placeholder for the input */
  placeholder: string;
  /** Soft min/max for hint only (not hard validation) */
  softMin?: number;
  softMax?: number;
}

export const TTT: GlossaryTerm = {
  code: "TTT",
  plain: "Cycle time (tap-to-tap)",
  meaning:
    "How long one heat takes from start to tap — the main clock of furnace productivity. Shorter (safely) means more heats per shift.",
  example: "A typical EAF heat at this plant lands around 50–80 minutes.",
};

export const GLOSSARY: Record<string, GlossaryTerm> = {
  TTT,
  heat: {
    code: "Heat",
    plain: "One furnace batch",
    meaning: "A single melt job in the Electric Arc Furnace — identified by a heat number.",
    example: "Heat 4618213 is one production batch.",
  },
  burden: {
    code: "Burden",
    plain: "Charge mix",
    meaning: "The recipe of materials loaded into the furnace (hot metal, DRI, scrap, fluxes, energy).",
  },
  HM: {
    code: "HM",
    plain: "Hot metal",
    meaning: "Liquid iron from the blast furnace — the largest liquid iron input to the EAF.",
  },
  DRI: {
    code: "DRI",
    plain: "Direct reduced iron",
    meaning: "Solid iron pellets made by reducing ore with gas — a main solid iron feed.",
  },
  HBI: {
    code: "HBI",
    plain: "Hot briquetted iron",
    meaning: "Compressed DRI briquettes — denser solid iron, often optional.",
  },
  Bucket: {
    code: "Bucket",
    plain: "Scrap buckets",
    meaning: "Steel scrap charged in buckets — extra solid iron / recycle feed.",
  },
  LIME: {
    code: "Lime",
    plain: "Lime (flux)",
    meaning: "Flux that helps form slag and remove impurities.",
  },
  DOLO: {
    code: "Dolomite",
    plain: "Dolomite (flux)",
    meaning: "Magnesia-bearing flux that protects the furnace lining and shapes slag.",
  },
  CPC: {
    code: "CPC",
    plain: "Carbon program",
    meaning: "Target carbon injection / carbon practice for the heat (plant program units).",
  },
  POWER: {
    code: "POWER",
    plain: "Electrical energy",
    meaning: "Electricity the arc will use for this heat, in kilowatt-hours (kWh).",
  },
  OXY: {
    code: "OXY",
    plain: "Oxygen program",
    meaning: "Target oxygen blown into the bath (plant program units / Nm³ scale).",
  },
  charge: {
    code: "Charge",
    plain: "Total charge weight",
    meaning: "Sum of the main iron inputs (HM + DRI + HBI + scrap). Typical heats sit near 110–130 tonnes.",
  },
};

/** Recipe input guidance — ranges aligned to plant defaults / operating band. */
export const RECIPE_FIELD_GUIDES: Record<string, FieldGuide> = {
  HM: {
    key: "HM",
    plain: "Hot metal",
    code: "HM",
    unit: "tonnes (t)",
    why: "Liquid iron from the blast furnace — usually the biggest liquid feed.",
    typical: "Typical: 45–65 t · Demo default: 56.8 t",
    placeholder: "e.g. 56.8",
    softMin: 30,
    softMax: 80,
  },
  DRI: {
    key: "DRI",
    plain: "Direct reduced iron",
    code: "DRI",
    unit: "tonnes (t)",
    why: "Solid iron pellets — balances the hot metal to reach total charge.",
    typical: "Typical: 45–75 t · Demo default: 63.2 t",
    placeholder: "e.g. 63.2",
    softMin: 20,
    softMax: 90,
  },
  HBI: {
    key: "HBI",
    plain: "Hot briquetted iron",
    code: "HBI",
    unit: "tonnes (t)",
    why: "Optional denser solid iron. Many heats use 0.",
    typical: "Typical: 0–20 t · Demo default: 0",
    placeholder: "0 if unused",
    softMin: 0,
    softMax: 30,
  },
  Bucket: {
    key: "Bucket",
    plain: "Scrap (buckets)",
    code: "Bucket",
    unit: "tonnes (t)",
    why: "Scrap steel charged in buckets. Often small or zero.",
    typical: "Typical: 0–15 t · Demo default: 0",
    placeholder: "0 if unused",
    softMin: 0,
    softMax: 25,
  },
  LIME: {
    key: "LIME",
    plain: "Lime",
    code: "LIME",
    unit: "tonnes (t)",
    why: "Flux for slag — helps chemistry and impurity removal.",
    typical: "Typical: 6–14 t · Demo default: 9.9 t",
    placeholder: "e.g. 9.9",
    softMin: 2,
    softMax: 20,
  },
  DOLO: {
    key: "DOLO",
    plain: "Dolomite",
    code: "DOLO",
    unit: "tonnes (t)",
    why: "Flux that supports lining life and slag practice.",
    typical: "Typical: 1–5 t · Demo default: 2.5 t",
    placeholder: "e.g. 2.5",
    softMin: 0,
    softMax: 10,
  },
  CPC: {
    key: "CPC",
    plain: "Carbon program",
    code: "CPC",
    unit: "program units",
    why: "Plant carbon injection / carbon practice target for the heat.",
    typical: "Typical: 400–700 · Demo default: 576",
    placeholder: "e.g. 576",
    softMin: 200,
    softMax: 900,
  },
  POWER: {
    key: "POWER",
    plain: "Electrical energy",
    code: "kWh",
    unit: "kilowatt-hours (kWh)",
    why: "How much electricity this heat is expected to consume.",
    typical: "Typical: 25,000–40,000 kWh · Demo default: 29,985",
    placeholder: "e.g. 29985",
    softMin: 15000,
    softMax: 50000,
  },
  OXY: {
    key: "OXY",
    plain: "Oxygen program",
    code: "OXY",
    unit: "program / Nm³ scale",
    why: "Oxygen blown to speed melting and refine the bath.",
    typical: "Typical: 3,000–5,000 · Demo default: 3,911",
    placeholder: "e.g. 3911",
    softMin: 1500,
    softMax: 7000,
  },
};

export function termLabel(term: GlossaryTerm, showCode = true): string {
  return showCode ? `${term.plain} (${term.code})` : term.plain;
}

/** Friendly page intros for newcomers. */
export const PAGE_EXPLAINERS = {
  prediction: {
    title: "What is this page? (for first-time visitors)",
    body: "You describe one furnace batch (a “heat”) — what materials go in and how much energy. The model then estimates how many minutes that batch will take. Steelmakers call that tap-to-tap time (TTT). Shorthand: cycle time in minutes.",
    steps: [
      "Enter any heat number (batch ID) — visitors can use 4618213.",
      "Leave the demo recipe as-is, or tap “Load demo recipe” / “Use suggested”.",
      "Press “Predict cycle time” — you get minutes, not a mysterious “TTT” score.",
      "Continue to Optimize if you want a suggested better mix.",
    ],
  },
  optimizer: {
    title: "What is this page? (for first-time visitors)",
    body: "The optimizer suggests small recipe changes that may shorten cycle time without breaking plant physics rules. You Accept, Modify, or Reject before recording the real result.",
    steps: [
      "Run the suggestion on the heat you just predicted.",
      "Compare current vs suggested cycle time (minutes).",
      "Lock Accept / Modify / Reject, then go to Validation.",
    ],
  },
  validation: {
    title: "What is this page? (for first-time visitors)",
    body: "After the real furnace heat finishes, you type the actual minutes it took. That closes the loop so the plant can compare prediction vs reality.",
    steps: [
      "Confirm heat number and predicted minutes.",
      "Enter actual cycle time from the shop floor (typical ~50–80 min).",
      "Save to open the heat report.",
    ],
  },
  heatHistory: {
    title: "What is this page?",
    body: "Every predicted heat is saved in the plant database. Use this list to find past batches, export records, or open a heat for review.",
    steps: [
      "Search by heat number or operator.",
      "Filter by shift, status, or time period if needed.",
      "Click a row to open details.",
    ],
  },
  reports: {
    title: "What is this page?",
    body: "A printable summary of the heat you just ran — prediction, recommendation, and actual minutes when available.",
    steps: [
      "Confirm the active heat in the workflow strip.",
      "Review the operator summary first.",
      "Export PDF/CSV only if you need a file for others.",
    ],
  },
  whatif: {
    title: "What is this page?",
    body: "Move a few sliders to explore how cycle time might change if you tweak the charge mix. This does not save a new heat until you apply it to Optimize.",
    steps: [
      "Start from the heat you already predicted.",
      "Adjust one variable at a time.",
      "Recalculate, then apply to Optimize if you like the mix.",
    ],
  },
  historical: {
    title: "What is this page?",
    body: "Compare your current recipe numbers against what this plant usually runs (common low / typical / high bands).",
    steps: [
      "Load or keep the demo recipe.",
      "Scan which inputs sit outside the usual band.",
      "Adjust on Predict if something looks extreme.",
    ],
  },
  health: {
    title: "What is this page?",
    body: "Quick gauges of whether the main charge and energy inputs look healthy versus plant practice — advisory only.",
    steps: [
      "Green means inside a comfortable band.",
      "Yellow/red means review the recipe before committing.",
    ],
  },
  productionHub: {
    title: "What is this page?",
    body: "Shift and production overview — queue, delays, and heats that need attention today.",
    steps: [
      "Check the attention items first.",
      "Use shortcuts to open Live Board, Approvals, or History.",
    ],
  },
  plantOverview: {
    title: "What is this page?",
    body: "Plant-level snapshot for managers — furnaces, today’s plan, and high-level KPIs.",
    steps: [
      "Scan KPIs for the day.",
      "Drill into Live Board or Heat History for detail.",
    ],
  },
  admin: {
    title: "What is this page?",
    body: "System health and administration — users, audits, and configuration for demos and support.",
    steps: [
      "Check health and open alerts first.",
      "Use Users / Audit only when managing access or investigating issues.",
    ],
  },
  liveBoard: {
    title: "What is this page?",
    body: "Kanban of heats across the floor — from waiting to validated. Drag is not required; open a heat to act.",
    steps: [
      "Find heats waiting on validation or approval.",
      "Open a card to continue the heat path.",
    ],
  },
  shiftAnalytics: {
    title: "What is this page?",
    body: "Charts and KPIs for the current shift’s heats — useful for stand-up and end-of-shift review.",
    steps: [
      "Pick the period (today / week).",
      "Use History for row-level detail.",
    ],
  },
} as const;
