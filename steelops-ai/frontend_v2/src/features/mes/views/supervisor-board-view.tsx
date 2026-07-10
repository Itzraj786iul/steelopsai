"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

export function SupervisorBoardView() {
  const [shift, setShift] = useState("A");
  const [board, setBoard] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mesApi
      .supervisorBoard(shift)
      .then(({ data }) => setBoard(data as Record<string, unknown>))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load supervisor board")));
  }, [shift]);

  const running = (board?.running_heats || []) as { heat_number: string; status: string }[];
  const delayed = (board?.delayed_heats || []) as { heat_number: string }[];
  const approvals = (board?.approval_queue || []) as { heat_number: string; stage: string }[];
  const validation = (board?.validation_queue || []) as { heat_number: string }[];
  const score = (board?.scorecard || {}) as Record<string, unknown>;
  const operators = (board?.operators || []) as string[];

  return (
    <PageContainer title="Shift Supervisor Board" description="Entire shift · operators · queues">
      <div className="mb-4 w-40">
        <Select value={shift} onValueChange={setShift}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["A", "B", "C"].map((s) => <SelectItem key={s} value={s}>Shift {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Scorecard">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(score).map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                <dd className="font-medium tabular-nums">{String(v ?? "—")}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
        <SectionCard title={`Operators (${operators.length})`}>
          <p className="text-sm font-mono">{operators.join(", ") || "—"}</p>
        </SectionCard>
        <SectionCard title="Running">
          <ul className="text-sm space-y-1">{running.map((h) => <li key={h.heat_number}>{h.heat_number}</li>)}</ul>
        </SectionCard>
        <SectionCard title="Delayed">
          <ul className="text-sm space-y-1">{delayed.map((h) => <li key={h.heat_number}>{h.heat_number}</li>)}</ul>
        </SectionCard>
        <SectionCard title="Approval queue">
          <ul className="text-sm space-y-1">{approvals.map((a) => <li key={a.heat_number}>{a.heat_number} · {a.stage}</li>)}</ul>
        </SectionCard>
        <SectionCard title="Validation queue">
          <ul className="text-sm space-y-1">{validation.map((h) => <li key={h.heat_number}>{h.heat_number}</li>)}</ul>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
