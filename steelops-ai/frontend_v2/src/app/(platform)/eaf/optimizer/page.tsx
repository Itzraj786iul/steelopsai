"use client";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizerDisclaimer } from "@/features/eaf/components/validation-banner";
import { RecipeForm } from "@/features/eaf/components/recipe-form";
import { useEafHistorical } from "@/features/eaf/hooks/use-eaf-historical";
import { useEafOptimize, useEafRecipe } from "@/features/eaf/hooks/use-eaf";
import { formatVariableLabel } from "@/lib/eaf-labels";

export default function EafOptimizerPage() {
  const { recipe, update, charge } = useEafRecipe();
  const { optimize, loading, error, result } = useEafOptimize();
  const { data: historical } = useEafHistorical(recipe);

  return (
    <PageContainer title="Recipe Optimizer" description="Physics-guided Phase 20.2 recipe optimization with constraint validation">
      <OptimizerDisclaimer className="mb-6" />
      <RecipeForm recipe={recipe} onChange={update} charge={charge} historicalVariables={historical?.variables} />
      <Button className="mt-6" onClick={() => optimize(recipe)} disabled={loading}>
        {loading ? "Optimizing…" : "Run Optimizer"}
      </Button>
      {error ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SectionCard title="Current">
              <p className="font-mono text-3xl">{result.current_ttt.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Optimized">
              <p className="font-mono text-3xl text-primary">{result.optimized_ttt.toFixed(2)} min</p>
            </SectionCard>
            <SectionCard title="Expected Saving">
              <p className="font-mono text-3xl text-green-600">{result.improvement_min.toFixed(2)} min</p>
            </SectionCard>
          </div>
          <SectionCard title="Recipe Comparison" className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2">Variable</th>
                    <th>Current</th>
                    <th>Optimized</th>
                    <th>Diff</th>
                    <th>%</th>
                    <th></th>
                    <th>Physics</th>
                  </tr>
                </thead>
                <tbody>
                  {result.comparison?.map((row) => (
                    <tr key={row.variable} className="border-b border-border/50">
                      <td className="py-2 font-medium">{formatVariableLabel(row.variable)}</td>
                      <td className="font-mono">{row.current.toFixed(2)}</td>
                      <td className="font-mono">{row.optimized.toFixed(2)}</td>
                      <td className="font-mono">
                        {row.difference >= 0 ? "+" : ""}
                        {row.difference.toFixed(2)}
                      </td>
                      <td className="font-mono">{row.pct_change.toFixed(1)}%</td>
                      <td>{row.arrow === "UP" ? "↑" : row.arrow === "DOWN" ? "↓" : "="}</td>
                      <td>
                        <Badge variant="outline">{row.physics_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Physics compliant: <strong>{result.physics_compliant ? "YES" : "NO"}</strong>
            </p>
          </SectionCard>
        </>
      ) : null}
    </PageContainer>
  );
}
