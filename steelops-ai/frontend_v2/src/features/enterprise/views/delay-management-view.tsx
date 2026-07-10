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
import { eafClient } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";

const CATEGORIES = [
  "Electrical",
  "Charging",
  "Crane",
  "Material",
  "Maintenance",
  "Power Restriction",
  "Safety",
  "Unknown",
];

interface DelayRow {
  id: string;
  heat_number?: string;
  category: string;
  start_time: string;
  end_time?: string;
  duration_min?: number;
  department?: string;
  root_cause?: string;
  reported_by?: string;
}

export function DelayManagementView() {
  const [rows, setRows] = useState<DelayRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    heat_number: "",
    category: CATEGORIES[0],
    start_time: new Date().toISOString().slice(0, 16),
    end_time: "",
    department: "",
    root_cause: "",
    corrective_action: "",
    status: "Open",
  });

  const load = () => {
    eafClient
      .get<DelayRow[]>("/delays")
      .then(({ data }) => setRows(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load delays")));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    try {
      await eafClient.post("/delays", {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create delay"));
    }
  };

  return (
    <PageContainer title="Delay Management" description="Track furnace delays and root causes">
      <SectionCard title="Log delay">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Heat number</Label>
            <Input value={form.heat_number} onChange={(e) => setForm({ ...form, heat_number: e.target.value })} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div>
            <Label>Department</Label>
            <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <Label>Root cause</Label>
            <Input value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} />
          </div>
          <div>
            <Label>Corrective action</Label>
            <Input value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Open", "Investigating", "Closed"].map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4" onClick={() => void submit()}>Save delay</Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Delay history" className="mt-6">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Category</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Duration</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Department</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Reported by</EnterpriseTableHeaderCell>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.heat_number || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.category}</EnterpriseTableCell>
                <EnterpriseTableCell mono>{r.duration_min != null ? `${r.duration_min} min` : "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.department || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.reported_by || "—"}</EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
