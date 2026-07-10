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
import { mesApi } from "@/lib/api/mes";
import { getApiErrorMessage } from "@/services/api-client";

interface PlanRow {
  id: string;
  production_date: string;
  shift_code: string;
  furnace_id: string;
  target_grade: string;
  target_heat_count: number;
  target_tonnage: number;
  target_ttt?: number;
  target_productivity?: number;
  target_electrical_energy?: number;
  priority: string;
  status: string;
}

export function ProductionPlanView() {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    production_date: new Date().toISOString().slice(0, 10),
    shift_code: "A",
    furnace_id: "EAF-1",
    target_grade: "",
    target_heat_count: 8,
    target_tonnage: 1000,
    target_ttt: 45,
    target_productivity: 100,
    target_electrical_energy: 40000,
    priority: "Normal",
    status: "Draft",
  });

  const load = () => {
    mesApi
      .plans()
      .then(({ data }) => setRows(data as PlanRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load plans")));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await mesApi.createPlan(form);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create plan"));
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await mesApi.updatePlan(id, { status });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Update failed"));
    }
  };

  return (
    <PageContainer title="Daily Production Plan" description="Plan heats, tonnage, TTT and energy by shift & furnace">
      <SectionCard title="Create plan">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={form.production_date} onChange={(e) => setForm({ ...form, production_date: e.target.value })} />
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={form.shift_code} onValueChange={(v) => setForm({ ...form, shift_code: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A", "B", "C"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Furnace</Label>
            <Select value={form.furnace_id} onValueChange={(v) => setForm({ ...form, furnace_id: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["EAF-1", "EAF-2", "LF-1"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target grade</Label>
            <Input value={form.target_grade} onChange={(e) => setForm({ ...form, target_grade: e.target.value })} />
          </div>
          <div>
            <Label>Target heat count</Label>
            <Input type="number" value={form.target_heat_count} onChange={(e) => setForm({ ...form, target_heat_count: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Target tonnage</Label>
            <Input type="number" value={form.target_tonnage} onChange={(e) => setForm({ ...form, target_tonnage: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Target TTT</Label>
            <Input type="number" value={form.target_ttt} onChange={(e) => setForm({ ...form, target_ttt: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Target productivity</Label>
            <Input type="number" value={form.target_productivity} onChange={(e) => setForm({ ...form, target_productivity: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Target electrical energy</Label>
            <Input type="number" value={form.target_electrical_energy} onChange={(e) => setForm({ ...form, target_electrical_energy: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Low", "Normal", "High", "Critical"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Create plan</Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Plans">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Date</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Shift</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Furnace</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Grade</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Heats</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Tonnage</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.production_date}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.shift_code}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.furnace_id}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.target_grade || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.target_heat_count}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.target_tonnage}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.status}</EnterpriseTableCell>
                <EnterpriseTableCell className="space-x-1">
                  <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "Approved")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => void setStatus(r.id, "Running")}>Run</Button>
                  <Button size="sm" variant="ghost" onClick={() => void setStatus(r.id, "Completed")}>Complete</Button>
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
