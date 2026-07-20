"use client";

import { useState } from "react";

import { GuidedNumberField } from "@/components/forms/guided-field";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/layout/section-card";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import type { EafRecipe } from "@/lib/api/eaf";
import { RECIPE_FIELD_GUIDES } from "@/lib/eaf-glossary";
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

function softOutOfRange(key: string, value: number): boolean {
  const g = RECIPE_FIELD_GUIDES[key];
  if (!g || !Number.isFinite(value)) return false;
  if (g.softMin != null && value < g.softMin) return true;
  if (g.softMax != null && value > g.softMax) return true;
  return false;
}

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

  const ironInputs = FIELDS.filter((f) => ["HM", "DRI", "HBI", "Bucket"].includes(f.key as string));
  const fluxes = FIELDS.filter((f) => ["LIME", "DOLO"].includes(f.key as string));
  const programs = FIELDS.filter((f) => ["CPC", "POWER", "OXY"].includes(f.key as string));

  return (
    <SectionCard
      title="Furnace charge mix"
      description={`Total iron charge: ${charge.toFixed(1)} tonnes · Plant heats usually land near ${chargeAssessment.bounds.median.toFixed(0)} t (common band ~${chargeAssessment.bounds.p5.toFixed(0)}–${chargeAssessment.bounds.p95.toFixed(0)} t). Defaults below are a realistic demo recipe — change only what you need.`}
    >
      <ValidationBanner messages={chargeAssessment.warnings} />

      <FieldGroup title="Iron feeds" subtitle="What goes into the furnace as metal / scrap">
        {ironInputs.map(({ key, step }) => (
          <GuidedNumberField
            key={key}
            id={key}
            guide={RECIPE_FIELD_GUIDES[key]}
            step={step}
            value={displayValue(key)}
            onChange={(raw) => handleNumericChange(key, raw)}
            onBlur={() => commitNumeric(key)}
            outOfRange={softOutOfRange(key, Number(recipe[key]))}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="Fluxes" subtitle="Slag-forming materials (smaller tonnages)">
        {fluxes.map(({ key, step }) => (
          <GuidedNumberField
            key={key}
            id={key}
            guide={RECIPE_FIELD_GUIDES[key]}
            step={step}
            value={displayValue(key)}
            onChange={(raw) => handleNumericChange(key, raw)}
            onBlur={() => commitNumeric(key)}
            outOfRange={softOutOfRange(key, Number(recipe[key]))}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="Energy & process programs" subtitle="Electricity, oxygen, and carbon practice">
        {programs.map(({ key, step }) => (
          <GuidedNumberField
            key={key}
            id={key}
            guide={RECIPE_FIELD_GUIDES[key]}
            step={step}
            value={displayValue(key)}
            onChange={(raw) => handleNumericChange(key, raw)}
            onBlur={() => commitNumeric(key)}
            outOfRange={softOutOfRange(key, Number(recipe[key]))}
          />
        ))}
      </FieldGroup>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="leading-snug">
            <span className="block text-sm font-medium">Shift</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Plant work window · A / B / C
            </span>
          </Label>
          <Select value={recipe.Shift} onValueChange={(v) => onChange("Shift", v as EafRecipe["Shift"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SHIFTS.map((s) => (
                <SelectItem key={s} value={s}>
                  Shift {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">Which crew / time block this heat belongs to.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="leading-snug">
            <span className="block text-sm font-medium">Electrical power restriction</span>
            <span className="text-[11px] font-normal text-muted-foreground">Grid / plant limit flag</span>
          </Label>
          <Select
            value={String(recipe.Power_Restriction)}
            onValueChange={(v) => onChange("Power_Restriction", Number(v) as 0 | 1)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No restriction (normal)</SelectItem>
              <SelectItem value="1">Restriction active</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Use “active” only when the plant is limiting electrical draw.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function FieldGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 first:mt-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
