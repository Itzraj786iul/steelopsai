"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/layout/section-card";
import type { EafRecipe } from "@/lib/api/eaf";
import { SHIFTS } from "@/lib/constants";

interface RecipeFormProps {
  recipe: EafRecipe;
  onChange: <K extends keyof EafRecipe>(key: K, value: EafRecipe[K]) => void;
  charge: number;
}

const FIELDS: { key: keyof EafRecipe; label: string; step?: string }[] = [
  { key: "HM", label: "HM (t)", step: "0.1" },
  { key: "DRI", label: "DRI (t)", step: "0.1" },
  { key: "HBI", label: "HBI (t)", step: "0.1" },
  { key: "Bucket", label: "Bucket (t)", step: "0.1" },
  { key: "LIME", label: "LIME (t)", step: "0.1" },
  { key: "DOLO", label: "DOLO (t)", step: "0.1" },
  { key: "CPC", label: "CPC", step: "1" },
  { key: "POWER", label: "POWER", step: "10" },
  { key: "OXY", label: "OXY", step: "1" },
];

export function RecipeForm({ recipe, onChange, charge }: RecipeFormProps) {
  return (
    <SectionCard title="Heat Recipe" description={`Total charge: ${charge.toFixed(1)} t`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map(({ key, label, step }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={key}>{label}</Label>
            <Input
              id={key}
              type="number"
              step={step}
              value={recipe[key] as number}
              onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
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
          <Label>Power Restriction</Label>
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
