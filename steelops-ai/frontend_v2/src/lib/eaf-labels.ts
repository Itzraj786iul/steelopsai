/** User-facing labels for EAF variables — backend field names stay unchanged. */

export const ELECTRICAL_ENERGY_LABEL = "Electrical Energy (kWh)";
export const ELECTRICAL_ENERGY_FULL_LABEL = "Electrical Energy Consumed (kWh)";

export const RECIPE_FIELD_LABELS: Record<string, string> = {
  HM: "HM (t)",
  DRI: "DRI (t)",
  HBI: "HBI (t)",
  Bucket: "Bucket (t)",
  LIME: "LIME (t)",
  DOLO: "DOLO (t)",
  CPC: "CPC",
  POWER: ELECTRICAL_ENERGY_LABEL,
  OXY: "OXY",
  Shift: "Shift",
  Power_Restriction: "Electrical Restriction",
};

export const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  POWER: ELECTRICAL_ENERGY_LABEL,
  HM_X_POWER: "HM × Electrical Energy",
  POWER_PER_TONNE: "Electrical Energy / Tonne",
  BUCKET_X_CPC: "Bucket × CPC",
  OXYGEN_PER_TONNE: "Oxygen / Tonne",
  SOLID_BURDEN_RATIO: "Solid Burden Ratio",
  HM_TO_DRI_RATIO: "HM / DRI Ratio",
  BURDEN_SHARE_RANGE: "Burden Share Range",
  HM_TO_BUCKET_RATIO: "HM / Bucket Ratio",
  BUCKET_X_DOLO: "Bucket × DOLO",
  CPC_X_DRI: "CPC × DRI",
  FLUX_PER_TONNE: "Flux / Tonne",
  FLUX_TO_CARBON_RATIO: "Flux / Carbon Ratio",
  DOLO_X_LIME: "DOLO × LIME",
  DOLO_SQ: "DOLO Squared",
  CPC_X_HBI: "CPC × HBI",
  DRI_TO_HBI_RATIO: "DRI / HBI Ratio",
  BUCKET_X_HBI: "Bucket × HBI",
  DOLO_X_HBI: "DOLO × HBI",
  HBI_SQ: "HBI Squared",
  SHIFT_LABEL: "Shift Label",
  SHIFT_C: "Shift C",
  CHARGE_BALANCE_ERROR: "Charge Balance Error",
  FLUX: "Flux (LIME + DOLO)",
  Total_Charge: "Total Charge (t)",
};

const POWER_WORD = /\bpower\b/i;

/** Map API / model feature keys to operator-friendly labels. */
export function formatVariableLabel(key: string): string {
  if (FEATURE_DISPLAY_NAMES[key]) return FEATURE_DISPLAY_NAMES[key];
  if (RECIPE_FIELD_LABELS[key]) return RECIPE_FIELD_LABELS[key];

  const normalized = key.replace(/_/g, " ");
  if (POWER_WORD.test(normalized)) {
    return normalized.replace(POWER_WORD, "Electrical Energy");
  }
  return normalized;
}

/** Relabel contributor items for display. */
export function formatContributorLabel(feature: string, displayName?: string): string {
  if (displayName && !POWER_WORD.test(displayName)) return displayName;
  if (displayName && POWER_WORD.test(displayName)) {
    return displayName.replace(/\bPower\b/g, "Electrical Energy").replace(/\bPOWER\b/g, ELECTRICAL_ENERGY_LABEL);
  }
  return formatVariableLabel(feature);
}
