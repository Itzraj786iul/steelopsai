"use client";

import { useEffect, useState } from "react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

interface ShiftRow {
  id: string;
  code: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  supervisor_id?: string;
  is_archived?: number;
  assignments?: { user_id: string; role_in_shift: string }[];
}

export function ShiftManagementView() {
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "A",
    name: "Shift A",
    start_time: "06:00",
    end_time: "14:00",
    status: "Upcoming",
  });

  const load = () => {
    opsApi
      .shifts()
      .then(({ data }) => setRows(data as ShiftRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load shifts")));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await opsApi.createShift(form);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create shift"));
    }
  };

  const archive = async (id: string) => {
    try {
      await opsApi.updateShift(id, { is_archived: true, status: "Completed" });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to archive shift"));
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await opsApi.updateShift(id, { status });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to update status"));
    }
  };

  return (
    <PageContainer title="Shift Management" description="Create, assign, and archive production shifts A / B / C">
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}
      <SectionCard title="Create shift" description="Registers the next production window">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Code</Label>
            <Select value={form.code} onValueChange={(v) => setForm({ ...form, code: v, name: `Shift ${v}` })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A", "B", "C"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Create shift</Button>
      </SectionCard>

      <SectionCard title="Shifts">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Code</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Name</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Hours</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Assigned</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.code}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.name}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.start_time}–{r.end_time}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.status}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.assignments?.length ?? 0}</EnterpriseTableCell>
                <EnterpriseTableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "Running")}>Run</Button>
                  <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "Completed")}>Complete</Button>
                  <Button size="sm" variant="ghost" onClick={() => void archive(r.id)}>Archive</Button>
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
