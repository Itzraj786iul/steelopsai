"use client";

import { useEffect, useState } from "react";

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
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const furnaceId = useOpsContextStore((s) => s.furnaceId);
  const [heatNumber, setHeatNumber] = useState("");

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

  const add = async () => {
    if (!heatNumber.trim()) return;
    try {
      await opsApi.createQueue({ heat_number: heatNumber.trim(), furnace_id: furnaceId, status: "Upcoming" });
      setHeatNumber("");
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
    <PageContainer title="Production Queue" description="Upcoming, running, delayed, validated, and archived heats">
      <SectionCard title="Add to queue">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Heat number</Label>
            <Input value={heatNumber} onChange={(e) => setHeatNumber(e.target.value)} placeholder="H-1024" />
          </div>
          <Button onClick={() => void add()}>Enqueue</Button>
          <div>
            <Label>Status filter</Label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title={`Queue · furnace ${furnaceId}`}>
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
            {rows.map((r, i) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{i + 1}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.heat_number}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.furnace_id}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  <Select value={r.status} onValueChange={(v) => void setStatus(r.id, v)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </EnterpriseTableCell>
                <EnterpriseTableCell className="space-x-1">
                  <Button size="sm" variant="outline" onClick={() => void move(i, -1)}>↑</Button>
                  <Button size="sm" variant="outline" onClick={() => void move(i, 1)}>↓</Button>
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
