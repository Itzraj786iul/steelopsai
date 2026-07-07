import type { PreheatDecisionPackage } from "@/types/preheat.types";

export function LearningInsights({ pkg }: { pkg: PreheatDecisionPackage }) {
  return (
    <div className="space-y-4">
      {pkg.learning_references.map((ref, index) => (
        <div key={ref.lesson_id ?? index} className="rounded-lg border border-border/70 bg-muted/20 p-4">
          <p className="font-medium">{ref.description ?? "Learning insight"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Type {ref.lesson_type ?? "audit"} · {ref.support_heats?.toLocaleString() ?? 0} supporting heats · avg improvement{" "}
            {ref.avg_realised_improvement_min?.toFixed(2) ?? "—"} min
          </p>
          {ref.action ? <p className="mt-2 text-sm">{ref.action}</p> : null}
        </div>
      ))}
      {pkg.learning_references.length === 0 ? (
        <p className="text-sm text-muted-foreground">No learning references in this decision package.</p>
      ) : null}
    </div>
  );
}
