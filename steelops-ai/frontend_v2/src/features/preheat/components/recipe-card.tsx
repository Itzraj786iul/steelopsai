"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ConfidenceBadge } from "@/features/preheat/components/confidence-badge";
import { formatPortfolioLabel } from "@/features/preheat/utils/preheat-utils";
import type { AlternativeRecipe } from "@/types/preheat.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationMinutes } from "@/lib/date-utils";

interface RecipeCardProps {
  title: string;
  recipe: AlternativeRecipe;
  selected?: boolean;
  onSelect?: () => void;
  compareHref?: string;
}

export function RecipeCard({ title, recipe, selected, onSelect, compareHref }: RecipeCardProps) {
  return (
    <Card className={selected ? "border-primary shadow-glow-primary" : "border-border/80"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <ConfidenceBadge tier={String(recipe.confidence ?? "MEDIUM")} score={recipe.confidence_score} />
        </div>
        <p className="text-xs text-muted-foreground">{formatPortfolioLabel(recipe)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Stat label="Heat time" value={formatDurationMinutes(Number(recipe.predicted_heat_time_min ?? 0))} />
          <Stat label="GREEN" value={`${Number(recipe.expected_GREEN_pct ?? 0).toFixed(1)}%`} />
          <Stat label="Save" value={formatDurationMinutes(Number(recipe.expected_at_reduction_min ?? 0))} />
          <Stat label="Power" value={`${Math.round(Number(recipe.expected_POWER ?? 0)).toLocaleString()} kWh`} />
        </div>
        <div className="flex gap-2">
          {onSelect ? (
            <Button size="sm" variant={selected ? "default" : "outline"} onClick={onSelect}>
              Select
            </Button>
          ) : null}
          {compareHref ? (
            <Button size="sm" variant="ghost" asChild>
              <Link href={compareHref}>
                Compare
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export function PortfolioGrid({
  recipes,
  compareBaseHref = "/recipes/compare",
}: {
  recipes: AlternativeRecipe[];
  compareBaseHref?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard
          key={String(recipe.candidate_id ?? recipe.portfolio_slot)}
          title={formatPortfolioLabel(recipe)}
          recipe={recipe}
          compareHref={compareBaseHref}
        />
      ))}
    </div>
  );
}

export function RecommendationTable({
  current,
  recommended,
}: {
  current: Record<string, number>;
  recommended: Record<string, number>;
}) {
  const keys = Array.from(new Set([...Object.keys(current), ...Object.keys(recommended)])).filter((k) =>
    ["HM", "DRI", "CPC", "LIME", "DOLO", "HBI", "T C"].includes(k)
  );

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3">Variable</th>
            <th className="px-4 py-3">Current</th>
            <th className="px-4 py-3">Recommended</th>
            <th className="px-4 py-3">Difference</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const base = Number(current[key] ?? 0);
            const next = Number(recommended[key] ?? 0);
            const delta = next - base;
            return (
              <tr key={key} className="border-t">
                <td className="px-4 py-3 font-medium">{key}</td>
                <td className="px-4 py-3 font-mono">{base.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono">{next.toFixed(2)}</td>
                <td className={`px-4 py-3 font-mono ${delta < 0 ? "text-accent" : delta > 0 ? "text-destructive" : ""}`}>
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
