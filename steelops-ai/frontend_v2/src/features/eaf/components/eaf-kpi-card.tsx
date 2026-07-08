import { SectionCard } from "@/components/layout/section-card";
import { cn } from "@/lib/utils";

interface EafKpiCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  className?: string;
  valueClassName?: string;
}

export function EafKpiCard({ title, value, subtitle, className, valueClassName }: EafKpiCardProps) {
  return (
    <SectionCard title={title} className={className}>
      <p className={cn("font-mono text-3xl font-bold tracking-tight text-foreground", valueClassName)}>{value}</p>
      {subtitle ? <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p> : null}
    </SectionCard>
  );
}
