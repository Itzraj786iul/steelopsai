import axios from "axios";

import { EAF_API_URL } from "@/lib/constants";

export interface EafRecipe {
  HM: number;
  DRI: number;
  HBI: number;
  Bucket: number;
  LIME: number;
  DOLO: number;
  CPC: number;
  POWER: number;
  OXY: number;
  Shift: "A" | "B" | "C";
  Power_Restriction: 0 | 1;
}

export const DEFAULT_RECIPE: EafRecipe = {
  HM: 56.8,
  DRI: 63.2,
  HBI: 0,
  Bucket: 0,
  LIME: 9.9,
  DOLO: 2.5,
  CPC: 576,
  POWER: 29985,
  OXY: 3911,
  Shift: "B",
  Power_Restriction: 0,
};

export const eafClient = axios.create({
  baseURL: EAF_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
});

export const eafApi = {
  health: () => eafClient.get("/health"),
  modelInfo: () => eafClient.get("/model-info"),
  predict: (recipe: EafRecipe) => eafClient.post("/predict", recipe),
  optimize: (recipe: EafRecipe, n_generate = 1000) =>
    eafClient.post("/optimize", { ...recipe, n_generate }),
  whatif: (recipe: EafRecipe) => eafClient.post("/whatif", recipe),
  historical: (recipe: EafRecipe) => eafClient.post("/historical", recipe),
  processHealth: (recipe: EafRecipe) => eafClient.post("/process-health", recipe),
  report: (recipe: EafRecipe, format: "json" | "csv" | "pdf") =>
    eafClient.post(
      "/report",
      { recipe, format, include_optimization: true },
      { responseType: format === "pdf" ? "blob" : "text" }
    ),
};
