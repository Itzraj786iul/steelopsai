"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { opsApi } from "@/lib/api/ops";
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/services/api-client";

interface Perf {
  today_heats: number;
  validated_heats: number;
  acceptance_rate: number | null;
  average_prediction_error: number | null;
  average_saving: number | null;
  average_ttt: number | null;
  pending_tasks: { id: string; title: string; priority: string; status: string }[];
}

export function OperatorPerformanceView() {
  const { user } = useAuth();
  const [perf, setPerf] = useState<Perf | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    opsApi
      .operatorPerf()
      .then(({ data }) => setPerf(data as Perf))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load performance")));
  }, []);

  const kpis = [
    { label: "Today's heats", value: perf?.today_heats ?? "—" },
    { label: "Validated", value: perf?.validated_heats ?? "—" },
    { label: "Acceptance %", value: perf?.acceptance_rate ?? "—" },
    { label: "Avg pred error", value: perf?.average_prediction_error ?? "—" },
    { label: "Avg saving", value: perf?.average_saving ?? "—" },
    { label: "Avg TTT", value: perf?.average_ttt ?? "—" },
  ];

  return (
    <PageContainer
      title="Operator Performance"
      description={`Personal KPIs for ${user?.full_name || user?.email || "operator"}`}
    >
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <SectionCard key={k.label} title={k.label}>
            <p className="text-2xl font-semibold tabular-nums">{k.value}</p>
          </SectionCard>
        ))}
      </div>
      <SectionCard title="Pending tasks">
        <ul className="space-y-2 text-sm">
          {(perf?.pending_tasks || []).map((t) => (
            <li key={t.id} className="flex justify-between border-b border-border/40 py-1">
              <span>{t.title}</span>
              <span className="text-muted-foreground">{t.priority} · {t.status}</span>
            </li>
          ))}
          {!perf?.pending_tasks?.length ? <li className="text-muted-foreground">No open tasks</li> : null}
        </ul>
        <Button asChild className="mt-3" variant="outline" size="sm">
          <Link href="/eaf/tasks">Open tasks</Link>
        </Button>
      </SectionCard>
    </PageContainer>
  );
}
