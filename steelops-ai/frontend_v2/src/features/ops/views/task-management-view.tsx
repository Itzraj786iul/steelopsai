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

interface TaskRow {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  due_at?: string;
  heat_number?: string;
}

export function TaskManagementView() {
  const [rows, setRows] = useState<TaskRow[]>([]);
  const [mine, setMine] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "Medium",
    due_at: "",
    heat_number: "",
  });

  const load = () => {
    opsApi
      .tasks({ mine })
      .then(({ data }) => setRows(data as TaskRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load tasks")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine]);

  const create = async () => {
    try {
      await opsApi.createTask({
        ...form,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
      });
      setForm({ title: "", description: "", priority: "Medium", due_at: "", heat_number: "" });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create task"));
    }
  };

  const complete = async (id: string) => {
    try {
      await opsApi.updateTask(id, { status: "Done" });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Update failed"));
    }
  };

  return (
    <PageContainer title="Task Management" description="Validate heat, review recommendation, enter actual TTT, delay reports">
      <SectionCard title="New task">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Low", "Medium", "High", "Critical"].map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Due</Label>
            <Input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} />
          </div>
          <div>
            <Label>Heat</Label>
            <Input value={form.heat_number} onChange={(e) => setForm({ ...form, heat_number: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => void create()}>Create</Button>
          <Button variant={mine ? "default" : "outline"} onClick={() => setMine(true)}>My tasks</Button>
          <Button variant={!mine ? "default" : "outline"} onClick={() => setMine(false)}>All tasks</Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Tasks">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Title</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Priority</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Due</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.title}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.priority}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.status}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.due_at?.slice(0, 16) || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.heat_number || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  {r.status !== "Done" ? (
                    <Button size="sm" onClick={() => void complete(r.id)}>Done</Button>
                  ) : null}
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
