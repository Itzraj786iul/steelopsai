import { SectionCard } from "@/components/layout/section-card";
import type { LearningReference } from "@/types/preheat.types";
import { ConfidenceBadge } from "@/features/preheat/components/confidence-badge";

export function EngineeringReasoning({ reasoning, rootCause }: { reasoning: string; rootCause: string }) {
  return (
    <SectionCard title="Engineering reasoning" description="Why the system recommends this path">
      <div className="space-y-4">
        <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
          <p className="text-label">Root cause</p>
          <p className="mt-2 text-sm leading-relaxed">{rootCause}</p>
        </div>
        <p className="text-sm leading-relaxed text-foreground/90">{reasoning}</p>
      </div>
    </SectionCard>
  );
}

export function ReasoningCard(props: { reasoning: string; rootCause: string }) {
  return <EngineeringReasoning {...props} />;
}

export function HistoricalEvidence({ references }: { references: LearningReference[] }) {
  return (
    <SectionCard title="Historical evidence" description="Industrial memory supporting this recommendation">
      <div className="space-y-3">
        {references.map((ref) => (
          <div key={ref.lesson_id} className="rounded-lg border border-border/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium">{ref.description}</p>
              {ref.confidence ? <ConfidenceBadge tier={ref.confidence} /> : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {typeof ref.support_heats === "number" ? <span>{ref.support_heats.toLocaleString()} heats</span> : null}
              {typeof ref.avg_realised_improvement_min === "number" ? (
                <span>Avg improvement {ref.avg_realised_improvement_min.toFixed(2)} min</span>
              ) : null}
            </div>
            {ref.action ? <p className="mt-3 text-sm text-muted-foreground">{ref.action}</p> : null}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function OperatorActions({ actions }: { actions: string[] }) {
  return (
    <SectionCard title="Operator actions" description="What to do next on the floor">
      <ol className="space-y-2">
        {actions.map((action, index) => (
          <li key={`${action}-${index}`} className="flex gap-3 rounded-lg border border-border/80 px-4 py-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {index + 1}
            </span>
            <span>{action}</span>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
