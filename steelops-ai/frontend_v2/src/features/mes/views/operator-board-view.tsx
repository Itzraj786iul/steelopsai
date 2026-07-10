"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { mesApi } from "@/lib/api/mes";
import { openPlannedHeat } from "@/lib/heat-history-sync";
import { getApiErrorMessage } from "@/services/api-client";
import { useRouter } from "next/navigation";

export function OperatorBoardView() {
  const router = useRouter();
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mesApi
      .operatorBoard()
      .then(({ data }) => setBoard(data as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load board")));
  }, []);

  const heats = (board?.assigned_heats || []) as { id: string; heat_number: string; status: string }[];
  const tasks = (board?.tasks || []) as { id: string; title: string; priority: string }[];
  const pending = (board?.pending_validations || []) as { heat_number: string }[];
  const summary = (board?.shift_summary || {}) as Record<string, unknown>;

  return (
    <PageContainer title="Operator Board" description="Assigned heats, validations, tasks, shift summary">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Assigned heats">
          <ul className="space-y-2 text-sm">
            {heats.map((h) => (
              <li key={h.id} className="flex items-center justify-between border-b border-border/40 py-1">
                <span>{h.heat_number} · {h.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void openPlannedHeat(h.heat_number).then((ok) => {
                      if (ok) router.push("/eaf/prediction");
                    })
                  }
                >
                  Open
                </Button>
              </li>
            ))}
            {!heats.length ? <li className="text-muted-foreground">No assigned heats</li> : null}
          </ul>
        </SectionCard>
        <SectionCard title="Pending validations">
          <ul className="space-y-1 text-sm">
            {pending.map((h) => (
              <li key={h.heat_number}>
                <Link className="underline" href="/eaf/validation">{h.heat_number}</Link>
              </li>
            ))}
            {!pending.length ? <li className="text-muted-foreground">None</li> : null}
          </ul>
        </SectionCard>
        <SectionCard title="Tasks">
          <ul className="space-y-1 text-sm">
            {tasks.map((t) => (
              <li key={t.id}>{t.title} · {t.priority}</li>
            ))}
            {!tasks.length ? <li className="text-muted-foreground">No open tasks</li> : null}
          </ul>
          <Button asChild className="mt-2" size="sm" variant="outline"><Link href="/eaf/tasks">All tasks</Link></Button>
        </SectionCard>
        <SectionCard title="Shift summary">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(summary).map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                <dd className="font-medium tabular-nums">{String(v ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
