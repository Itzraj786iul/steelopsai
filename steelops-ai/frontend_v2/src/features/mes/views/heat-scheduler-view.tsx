"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import { DEFAULT_RECIPE } from "@/lib/api/eaf";
import { mesApi } from "@/lib/api/mes";
import { openPlannedHeat } from "@/lib/heat-history-sync";
import { getApiErrorMessage } from "@/services/api-client";

interface HeatRow {
  id: string;
  heat_number: string;
  target_grade?: string;
  target_charge?: number;
  expected_start?: string;
  expected_end?: string;
  assigned_shift?: string;
  assigned_furnace?: string;
  priority?: string;
  status: string;
}

export function HeatSchedulerView() {
  const router = useRouter();
  const [rows, setRows] = useState<HeatRow[]>([]);
  const [plans, setPlans] = useState<{ id: string; production_date: string; shift_code: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    heat_number: "",
    plan_id: "",
    target_grade: "",
    target_charge: 140,
    expected_start: new Date().toISOString().slice(0, 16),
    expected_end: "",
    assigned_shift: "A",
    assigned_furnace: "EAF-1",
    priority: "Normal",
  });

  const load = () => {
    Promise.all([mesApi.heats(), mesApi.plans()])
      .then(([h, p]) => {
        setRows(h.data as HeatRow[]);
        const plist = p.data as { id: string; production_date: string; shift_code: string }[];
        setPlans(plist);
        if (!form.plan_id && plist[0]) setForm((f) => ({ ...f, plan_id: plist[0].id }));
      })
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load scheduler")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!form.heat_number.trim()) return;
    try {
      await mesApi.createHeat({
        ...form,
        expected_start: form.expected_start ? new Date(form.expected_start).toISOString() : null,
        expected_end: form.expected_end ? new Date(form.expected_end).toISOString() : null,
        recipe: { ...DEFAULT_RECIPE, Shift: form.assigned_shift },
        plan_id: form.plan_id || null,
      });
      setForm((f) => ({ ...f, heat_number: "" }));
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to schedule heat"));
    }
  };

  const open = async (heatNumber: string) => {
    const ok = await openPlannedHeat(heatNumber);
    if (ok) router.push("/eaf/prediction");
    else setError("Could not open planned heat");
  };

  return (
    <PageContainer title="Heat Scheduler" description="Plan heats before production — recipe pre-loaded for AI">
      <SectionCard title="Schedule heat">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Heat number</Label>
            <Input value={form.heat_number} onChange={(e) => setForm({ ...form, heat_number: e.target.value })} />
          </div>
          <div>
            <Label>Plan</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.plan_id}
              onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            >
              <option value="">— none —</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.production_date} · Shift {p.shift_code}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Grade</Label>
            <Input value={form.target_grade} onChange={(e) => setForm({ ...form, target_grade: e.target.value })} />
          </div>
          <div>
            <Label>Target charge (t)</Label>
            <Input type="number" value={form.target_charge} onChange={(e) => setForm({ ...form, target_charge: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Expected start</Label>
            <Input type="datetime-local" value={form.expected_start} onChange={(e) => setForm({ ...form, expected_start: e.target.value })} />
          </div>
          <div>
            <Label>Furnace</Label>
            <Select value={form.assigned_furnace} onValueChange={(v) => setForm({ ...form, assigned_furnace: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["EAF-1", "EAF-2", "LF-1"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={form.assigned_shift} onValueChange={(v) => setForm({ ...form, assigned_shift: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A", "B", "C"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Add to schedule</Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Scheduled heats">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Grade</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Furnace</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Shift</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Start</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.heat_number}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.target_grade || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.assigned_furnace}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.assigned_shift}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.expected_start?.slice(0, 16) || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.status}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  <Button size="sm" onClick={() => void open(r.heat_number)}>Open in AI</Button>
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
