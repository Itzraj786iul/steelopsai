"use client";

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

export function RecipeForm({ recipe, onChange, charge, historicalVariables }: RecipeFormProps) {
  const chargeAssessment = assessCharge(charge, historicalVariables);

  const handleNumericChange = (key: keyof EafRecipe, raw: string) => {
    const value = parseRecipeNumber(raw, 0);
    onChange(key, value as EafRecipe[typeof key]);
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
              step={step}
              min={0}
              value={Number.isFinite(recipe[key] as number) ? (recipe[key] as number) : ""}
              onChange={(e) => handleNumericChange(key, e.target.value)}
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
