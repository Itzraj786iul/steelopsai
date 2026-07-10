"use client";

import { useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

export function ProductionTimelineView() {
  const [heatId, setHeatId] = useState("");
  const [heatNumber, setHeatNumber] = useState("");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      let id = heatId;
      if (!id && heatNumber) {
        const { data: h } = await mesApi.getHeatByNumber(heatNumber);
        id = (h as { id: string }).id;
        setHeatId(id);
      }
      if (!id) return;
      const { data: t } = await mesApi.timeline(id);
      setData(t as Record<string, unknown>);
      setError(null);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Timeline load failed"));
    }
  };

  const events = (data?.events || []) as {
    event_type: string;
    occurred_at: string;
    duration_from_prev_min?: number;
  }[];
  const stages = (data?.stages || []) as string[];

  return (
    <PageContainer title="Production Timeline" description="Shift start → prediction → tap → validation → archive">
      <SectionCard title="Lookup">
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Heat number" value={heatNumber} onChange={(e) => setHeatNumber(e.target.value)} className="max-w-xs" />
          <Button onClick={() => void load()}>Load timeline</Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Status ladder">
        <ol className="flex flex-wrap gap-2 text-xs">
          {stages.filter((s) => !["Delayed", "Cancelled"].includes(s)).map((s) => (
            <li key={s} className="rounded border border-border/60 px-2 py-1">{s}</li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title="Events & durations">
        <ul className="space-y-2 text-sm">
          {events.map((e, i) => (
            <li key={i} className="flex justify-between border-b border-border/40 py-1">
              <span className="font-medium">{e.event_type}</span>
              <span className="text-muted-foreground">
                {e.occurred_at?.slice(0, 19)}
                {e.duration_from_prev_min != null ? ` · +${e.duration_from_prev_min} min` : ""}
              </span>
            </li>
          ))}
          {!events.length ? <li className="text-muted-foreground">No events yet</li> : null}
        </ul>
      </SectionCard>
    </PageContainer>
  );
}
