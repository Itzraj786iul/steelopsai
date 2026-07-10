"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface HandoverRow {
  id: string;
  shift_id: string;
  status: string;
  production_summary?: string;
  outgoing_signature?: string;
  incoming_signature?: string;
  acknowledged_at?: string;
}

export function ShiftHandoverView() {
  const [rows, setRows] = useState<HandoverRow[]>([]);
  const [shifts, setShifts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    shift_id: "",
    production_summary: "",
    problems: "",
    delay_reasons: "",
    equipment_observations: "",
    pending_heats: "",
    pending_validation: "",
    recommendations: "",
    outgoing_signature: "",
  });
  const [ackSig, setAckSig] = useState("");

  const load = () => {
    Promise.all([opsApi.handovers(), opsApi.shifts()])
      .then(([h, s]) => {
        setRows(h.data as HandoverRow[]);
        const list = s.data as { id: string; code: string; name: string }[];
        setShifts(list);
        if (!form.shift_id && list[0]) setForm((f) => ({ ...f, shift_id: list[0].id }));
      })
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load handovers")));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    try {
      await opsApi.createHandover(form);
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create handover"));
    }
  };

  const ack = async (id: string) => {
    try {
      await opsApi.ackHandover(id, ackSig || "Acknowledged");
      setAckSig("");
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Acknowledge failed"));
    }
  };

  return (
    <PageContainer title="Shift Handover" description="Digital handover with signatures">
      <SectionCard title="Outgoing shift report">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Shift</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.shift_id}
              onChange={(e) => setForm({ ...form, shift_id: e.target.value })}
            >
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
          </div>
          {(
            [
              ["production_summary", "Production summary"],
              ["problems", "Problems"],
              ["delay_reasons", "Delay reasons"],
              ["equipment_observations", "Equipment observations"],
              ["pending_heats", "Pending heats"],
              ["pending_validation", "Pending validation"],
              ["recommendations", "Recommendations"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Label>{label}</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                rows={2}
              />
            </div>
          ))}
          <div>
            <Label>Outgoing signature</Label>
            <Input
              value={form.outgoing_signature}
              onChange={(e) => setForm({ ...form, outgoing_signature: e.target.value })}
              placeholder="Full name"
            />
          </div>
        </div>
        <Button className="mt-4" onClick={() => void submit()}>Submit handover</Button>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </SectionCard>

      <SectionCard title="Handover log">
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Incoming signature"
            value={ackSig}
            onChange={(e) => setAckSig(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Shift</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Outgoing</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Incoming</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Action</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell className="font-mono text-xs">{r.shift_id.slice(0, 8)}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.status}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.outgoing_signature || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.incoming_signature || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  {r.status !== "Acknowledged" ? (
                    <Button size="sm" onClick={() => void ack(r.id)}>Acknowledge</Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">{r.acknowledged_at?.slice(0, 19)}</span>
                  )}
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
