"use client";

import { useState } from "react";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { opsApi } from "@/lib/api/ops";
import { getApiErrorMessage } from "@/services/api-client";

type SearchResult = Record<string, Record<string, unknown>[]>;

export function EnterpriseSearchView() {
  const [q, setQ] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!q.trim()) return;
    try {
      const { data } = await opsApi.search(q.trim());
      setResult(data as SearchResult);
      setError(null);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Search failed"));
    }
  };

  return (
    <PageContainer title="Enterprise Search" description="Users, heats, shifts, delays, tasks, queue, announcements">
      <SectionCard title="Search">
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Heat number, operator, shift…"
            onKeyDown={(e) => {
              if (e.key === "Enter") void run();
            }}
          />
          <Button onClick={() => void run()}>Search</Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      {result
        ? Object.entries(result).map(([bucket, items]) =>
            items.length ? (
              <SectionCard key={bucket} title={`${bucket} (${items.length})`}>
                <ul className="space-y-2 text-sm">
                  {items.map((item, i) => (
                    <li key={i} className="rounded border border-border/60 px-3 py-2 font-mono text-xs">
                      {bucket === "heats" && item.heat_number ? (
                        <Link className="text-primary underline" href={`/eaf/heats/${String(item.heat_number)}`}>
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
