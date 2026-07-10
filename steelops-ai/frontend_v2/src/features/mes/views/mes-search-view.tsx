"use client";

import { useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

export function MesSearchView() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<Record<string, Record<string, unknown>[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!q.trim()) return;
    try {
      const { data } = await mesApi.search(q.trim());
      setResult(data as Record<string, Record<string, unknown>[]>);
      setError(null);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Search failed"));
    }
  };

  return (
    <PageContainer title="MES Search" description="Heat · operator · shift · grade · furnace · date · status">
      <SectionCard title="Search">
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void run()} placeholder="H-1024, EAF-1, grade…" />
          <Button onClick={() => void run()}>Search</Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>
      {result
        ? Object.entries(result).map(([bucket, items]) =>
            items?.length ? (
              <SectionCard key={bucket} title={`${bucket} (${items.length})`}>
                <ul className="space-y-1 text-xs font-mono">
                  {items.map((item, i) => (
                    <li key={i}>
                      {bucket === "planned_heats" && item.heat_number ? (
                        <Link className="text-primary underline" href="/eaf/heat-scheduler">
                          {JSON.stringify(item)}
                        </Link>
                      ) : (
                        JSON.stringify(item)
                      )}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null
          )
        : null}
    </PageContainer>
  );
}
