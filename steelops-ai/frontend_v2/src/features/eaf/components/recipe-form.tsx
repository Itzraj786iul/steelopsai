"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { GuidedNumberField } from "@/components/forms/guided-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/layout/section-card";
import { PageAlert } from "@/components/feedback/page-alert";
import { ValidationBanner } from "@/features/eaf/components/validation-banner";
import { DEFAULT_RECIPE, type EafRecipe } from "@/lib/api/eaf";
import { RECIPE_FIELD_GUIDES } from "@/lib/eaf-glossary";
import { assessCharge, parseRecipeNumber } from "@/lib/charge-validation";
import { SHIFTS } from "@/lib/constants";
import type { HistoricalVariable } from "@/lib/api/eaf";

interface RecipeFormProps {
  recipe: EafRecipe;
  onChange: <K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => void;
  charge: number;
  historicalVariables?: HistoricalVariable[];
  /** Replace entire recipe (used by “Load demo recipe”) */
  onReplaceRecipe?: (recipe: EafRecipe) => void;
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

export function RecipeForm({
  recipe,
  onChange,
  charge,
  historicalVariables,
  onReplaceRecipe,
}: RecipeFormProps) {
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

  const applySuggested = (key: NumericRecipeKey, value: number) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    onChange(key, value as EafRecipe[typeof key]);
  };

  const loadDemo = () => {
    setDrafts({});
    if (onReplaceRecipe) {
      onReplaceRecipe({ ...DEFAULT_RECIPE });
      return;
    }
    (Object.keys(DEFAULT_RECIPE) as (keyof EafRecipe)[]).forEach((key) => {
      onChange(key, DEFAULT_RECIPE[key]);
    });
  };

  const ironInputs = FIELDS.filter((f) => ["HM", "DRI", "HBI", "Bucket"].includes(f.key as string));
  const fluxes = FIELDS.filter((f) => ["LIME", "DOLO"].includes(f.key as string));
  const programs = FIELDS.filter((f) => ["CPC", "POWER", "OXY"].includes(f.key as string));

  return (
    <SectionCard
      title="Furnace charge mix"
      description="These are the materials and energy for one furnace batch. Not a metallurgist? Keep the demo numbers — they are a realistic plant recipe — then press Predict."
      actions={
        <Button type="button" size="sm" variant="outline" onClick={loadDemo}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Load demo recipe
        </Button>
      }
    >
      <PageAlert tone="info" title="New here? You do not need to invent numbers.">
        Click <strong>Load demo recipe</strong> (or leave the defaults). Each box shows a plain name, the plant
        code in parentheses, and a typical range. Hover the ? for a short explanation.
      </PageAlert>

      <p className="mt-4 text-sm text-muted-foreground">
        Total iron charge right now:{" "}
        <span className="font-mono font-semibold text-foreground">{charge.toFixed(1)} tonnes</span>
        {" · "}
        most plant heats sit near {chargeAssessment.bounds.median.toFixed(0)} t (about{" "}
        {chargeAssessment.bounds.p5.toFixed(0)}–{chargeAssessment.bounds.p95.toFixed(0)} t is common).
      </p>

      <ValidationBanner messages={chargeAssessment.warnings} className="mt-3" />

      <FieldGroup title="1. Iron feeds" subtitle="Metal that goes into the furnace (largest numbers — tonnes)">
        {ironInputs.map(({ key, step }) => (
          <GuidedNumberField
            key={key}
            id={key}
            guide={RECIPE_FIELD_GUIDES[key]}
            step={step}
            value={displayValue(key)}
            onChange={(raw) => handleNumericChange(key, raw)}
            onBlur={() => commitNumeric(key)}
            suggestedValue={DEFAULT_RECIPE[key] as number}
            onUseSuggested={(v) => applySuggested(key, v)}
            outOfRange={softOutOfRange(key, Number(recipe[key]))}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="2. Fluxes" subtitle="Helps make slag and protect the furnace (smaller tonnages)">
        {fluxes.map(({ key, step }) => (
          <GuidedNumberField
            key={key}
            id={key}
            guide={RECIPE_FIELD_GUIDES[key]}
            step={step}
            value={displayValue(key)}
            onChange={(raw) => handleNumericChange(key, raw)}
            onBlur={() => commitNumeric(key)}
            suggestedValue={DEFAULT_RECIPE[key] as number}
            onUseSuggested={(v) => applySuggested(key, v)}
            outOfRange={softOutOfRange(key, Number(recipe[key]))}
          />
        ))}
      </FieldGroup>

      <FieldGroup title="3. Energy & process programs" subtitle="Electricity, oxygen, and carbon practice">
        {programs.map(({ key, step }) => (
          <GuidedNumberField
            key={key}
            id={key}
            guide={RECIPE_FIELD_GUIDES[key]}
            step={step}
            value={displayValue(key)}
            onChange={(raw) => handleNumericChange(key, raw)}
            onBlur={() => commitNumeric(key)}
            suggestedValue={DEFAULT_RECIPE[key] as number}
            onUseSuggested={(v) => applySuggested(key, v)}
            outOfRange={softOutOfRange(key, Number(recipe[key]))}
          />
        ))}
      </FieldGroup>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/10 p-3">
          <Label className="leading-snug">
            <span className="block text-sm font-semibold">Shift</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Which work window · A morning / B afternoon / C night (plant-specific)
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
        </div>
        <div className="space-y-1.5 rounded-lg border border-border/50 bg-muted/10 p-3">
          <Label className="leading-snug">
            <span className="block text-sm font-semibold">Electrical power restriction</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Is the plant limiting electricity right now?
            </span>
          </Label>
          <Select
            value={String(recipe.Power_Restriction)}
            onValueChange={(v) => onChange("Power_Restriction", Number(v) as 0 | 1)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No — normal power available</SelectItem>
              <SelectItem value="1">Yes — restriction is active</SelectItem>
            </SelectContent>
          </Select>
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
    <div className="mt-6">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
