"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { opsApi } from "@/lib/api/ops";
import { useOpsContextStore } from "@/stores/ops-context-store";
import { getApiErrorMessage } from "@/services/api-client";

const STATUSES = ["Upcoming", "Running", "Completed", "Delayed", "Validated", "Archived", "WaitingValidation"];

interface QueueRow {
  id: string;
  heat_number: string;
  furnace_id?: string;
  status: string;
  sort_order: number;
  notes?: string;
}

export function HeatQueueView() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("q") || "";
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [query, setQuery] = useState(highlight);
  const furnaceId = useOpsContextStore((s) => s.furnaceId);
  const [heatNumber, setHeatNumber] = useState("");

  useEffect(() => {
    if (highlight) setQuery(highlight);
  }, [highlight]);

  const load = () => {
    opsApi
      .queue({
        status: filter === "all" ? undefined : filter,
        furnace_id: furnaceId || undefined,
      })
      .then(({ data }) => setRows(data as QueueRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load queue")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, furnaceId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.heat_number.toLowerCase().includes(q));
  }, [rows, query]);

  const add = async () => {
    if (!heatNumber.trim()) return;
    try {
      await opsApi.createQueue({ heat_number: heatNumber.trim(), furnace_id: furnaceId, status: "Upcoming" });
      setHeatNumber("");
      setError(null);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to add heat"));
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...rows];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setRows(next);
    try {
      await opsApi.reorderQueue(next.map((r) => r.id));
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Reorder failed"));
      load();
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await opsApi.updateQueue(id, { status });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Status update failed"));
    }
  };

  return (
    <PageContainer
      title="Production Queue"
      description="Upcoming, running, delayed, validated, and archived heats"
      meta={`Active furnace · ${furnaceId}`}
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      <SectionCard title="Enqueue & filter" description="Add a heat, then refine the list">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="queue-heat">Heat number</Label>
            <Input
              id="queue-heat"
              value={heatNumber}
              onChange={(e) => setHeatNumber(e.target.value)}
              placeholder="H-1024"
            />
          </div>
          <div>
            <Label>Status filter</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="queue-find">Find heat</Label>
            <Input
              id="queue-find"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search heat #"
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full sm:w-auto" onClick={() => void add()} disabled={!heatNumber.trim()}>
              Enqueue
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Queue · ${furnaceId}`} description={`${visible.length} of ${rows.length} heats shown`}>
        {visible.length ? (
          <EnterpriseTable>
            <EnterpriseTableHead>
              <EnterpriseTableRow>
                <EnterpriseTableHeaderCell>#</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Furnace</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Order</EnterpriseTableHeaderCell>
              </EnterpriseTableRow>
            </EnterpriseTableHead>
            <EnterpriseTableBody>
              {visible.map((r) => {
                const i = rows.findIndex((x) => x.id === r.id);
                const highlighted = highlight && r.heat_number.toLowerCase().includes(highlight.toLowerCase());
                return (
                  <EnterpriseTableRow key={r.id} className={highlighted ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : undefined}>
                    <EnterpriseTableCell>{i + 1}</EnterpriseTableCell>
                    <EnterpriseTableCell className="font-medium">{r.heat_number}</EnterpriseTableCell>
                    <EnterpriseTableCell>{r.furnace_id}</EnterpriseTableCell>
                    <EnterpriseTableCell>
                      <Select value={r.status} onValueChange={(v) => void setStatus(r.id, v)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </EnterpriseTableCell>
                    <EnterpriseTableCell className="space-x-1">
                      <Button size="sm" variant="outline" onClick={() => void move(i, -1)}>
                        ↑
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void move(i, 1)}>
                        ↓
                      </Button>
                    </EnterpriseTableCell>
                  </EnterpriseTableRow>
                );
              })}
            </EnterpriseTableBody>
          </EnterpriseTable>
        ) : (
          <EmptyState
            title={rows.length ? "No matches" : "Queue is empty"}
            description={
              rows.length
                ? "Clear the search or change the status filter."
                : "Enqueue a heat number above to start the production order."
            }
            className="py-10"
          />
        )}
      </SectionCard>
    </PageContainer>
  );
}
