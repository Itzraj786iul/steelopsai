"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/layout/section-card";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import type { EafRecipe } from "@/lib/api/eaf";
import { RECIPE_FIELD_LABELS } from "@/lib/eaf-labels";
import { assessCharge, parseRecipeNumber } from "@/lib/charge-validation";
import { SHIFTS } from "@/lib/constants";
import type { HistoricalVariable } from "@/lib/api/eaf";

interface RecipeFormProps {
  recipe: EafRecipe;
  onChange: <K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => void;
  charge: number;
  historicalVariables?: HistoricalVariable[];
}

const FIELDS: { key: keyof EafRecipe; step?: string }[] = [
  { key: "HM", step: "0.1" },
  { key: "DRI", step: "0.1" },
  { key: "HBI", step: "0.1" },
  { key: "Bucket", step: "0.1" },
  { key: "LIME", step: "0.1" },
  { key: "DOLO", step: "0.1" },
  { key: "CPC", step: "1" },
  { key: "POWER", step: "10" },
  { key: "OXY", step: "1" },
];

type NumericRecipeKey = (typeof FIELDS)[number]["key"];

export function RecipeForm({ recipe, onChange, charge, historicalVariables }: RecipeFormProps) {
  const chargeAssessment = assessCharge(charge, historicalVariables);
  // Keep raw text while editing so Backspace can clear the field (empty ≠ forced 0).
  const [drafts, setDrafts] = useState<Partial<Record<NumericRecipeKey, string>>>({});

  const displayValue = (key: NumericRecipeKey) => {
    if (Object.prototype.hasOwnProperty.call(drafts, key)) return drafts[key] ?? "";
    const n = recipe[key] as number;
    return Number.isFinite(n) ? String(n) : "";
  };

  const handleNumericChange = (key: NumericRecipeKey, raw: string) => {
    setDrafts((prev) => ({ ...prev, [key]: raw }));
    if (raw.trim() === "" || raw === "-" || raw === "." || raw === "-.") {
      onChange(key, 0 as EafRecipe[typeof key]);
      return;
    }
    const value = parseFloat(raw);
    if (Number.isFinite(value)) {
      onChange(key, value as EafRecipe[typeof key]);
    }
  };

  const commitNumeric = (key: NumericRecipeKey) => {
    const raw = drafts[key];
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (raw === undefined) return;
    onChange(key, parseRecipeNumber(raw, 0) as EafRecipe[typeof key]);
  };

  return (
    <SectionCard
      title="Burden Composition"
      description={`Total charge: ${charge.toFixed(1)} t · Historical median ${chargeAssessment.bounds.median.toFixed(0)} t (P5–P95: ${chargeAssessment.bounds.p5.toFixed(0)}–${chargeAssessment.bounds.p95.toFixed(0)} t)`}
    >
      <ValidationBanner messages={chargeAssessment.warnings} />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map(({ key, step }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{RECIPE_FIELD_LABELS[key] ?? key}</Label>
            <Input
              id={key}
              type="number"
              inputMode="decimal"
              step={step}
              min={0}
              value={displayValue(key)}
              onChange={(e) => handleNumericChange(key, e.target.value)}
              onBlur={() => commitNumeric(key)}
            />
          </div>
        ))}
        <div className="space-y-2">
          <Label>Shift</Label>
          <Select value={recipe.Shift} onValueChange={(v) => onChange("Shift", v as EafRecipe["Shift"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHIFTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{RECIPE_FIELD_LABELS.Power_Restriction}</Label>
          <Select
            value={String(recipe.Power_Restriction)}
            onValueChange={(v) => onChange("Power_Restriction", Number(v) as 0 | 1)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No restriction</SelectItem>
              <SelectItem value="1">Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </SectionCard>
  );
}
