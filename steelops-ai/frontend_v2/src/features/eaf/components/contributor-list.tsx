import type { ContributorItem } from "@/lib/api/eaf";
import { SectionCard } from "@/components/layout/section-card";
import { formatContributorLabel } from "@/lib/eaf-labels";

interface ContributorListProps {
  title?: string;
  description?: string;
  contributors: ContributorItem[];
  limit?: number;
}

export function ContributorList({
  title = "Top Contributors",
  description = "SHAP-style attribution for the current prediction",
  contributors,
  limit = 5,
}: ContributorListProps) {
  const items = contributors.slice(0, limit);

  return (
    <SectionCard title={title} description={description}>
      {items.length ? (
        <ul className="space-y-2 text-sm">
          {items.map((c) => (
            <li key={c.feature} className="flex items-center justify-between border-b border-border/50 py-2 last:border-0">
              <span>{formatContributorLabel(c.feature, c.display_name)}</span>
              <span className="font-mono text-muted-foreground">{c.contribution?.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Run a prediction to see contributor attribution.</p>
      )}
    </SectionCard>
  );
}
