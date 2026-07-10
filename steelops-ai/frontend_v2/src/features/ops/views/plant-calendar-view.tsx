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
import { getApiErrorMessage } from "@/services/api-client";

interface CalRow {
  id: string;
  title: string;
  event_type: string;
  start_at: string;
  end_at?: string;
  furnace_id?: string;
}

export function PlantCalendarView() {
  const [rows, setRows] = useState<CalRow[]>([]);
  const [view, setView] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    event_type: "Production",
    start_at: new Date().toISOString().slice(0, 16),
    end_at: "",
    furnace_id: "EAF-1",
  });

  const range = () => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);
    if (view === "daily") {
      return { date_from: from.toISOString().slice(0, 10), date_to: to.toISOString().slice(0, 10) };
    }
    if (view === "weekly") {
      from.setDate(from.getDate() - from.getDay());
      to.setDate(from.getDate() + 6);
      return { date_from: from.toISOString().slice(0, 10), date_to: to.toISOString().slice(0, 10) };
    }
    from.setDate(1);
    to.setMonth(to.getMonth() + 1, 0);
    return { date_from: from.toISOString().slice(0, 10), date_to: to.toISOString().slice(0, 10) };
  };

  const load = () => {
    opsApi
      .calendar(range())
      .then(({ data }) => setRows(data as CalRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load calendar")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const create = async () => {
    try {
      await opsApi.createCalendar({
        ...form,
        start_at: new Date(form.start_at).toISOString(),
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create event"));
    }
  };

  return (
    <PageContainer title="Plant Calendar" description="Shifts, maintenance, downtime, production, reports">
      <div className="mb-4 flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((v) => (
          <Button key={v} variant={view === v ? "default" : "outline"} size="sm" onClick={() => setView(v)}>
            {v}
          </Button>
        ))}
      </div>

      <SectionCard title="Add event">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Shift", "Maintenance", "Downtime", "Production", "Report"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Add</Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title={`${view} events`}>
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Title</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Type</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Start</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Furnace</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.title}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.event_type}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.start_at?.slice(0, 16)}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.furnace_id || "—"}</EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
