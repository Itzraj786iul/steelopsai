"use client";

import { useEffect, useState } from "react";

import { PageAlert } from "@/components/feedback/page-alert";
import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useOpsContextStore } from "@/stores/ops-context-store";
import { getApiErrorMessage } from "@/services/api-client";

interface FurnaceRow {
  id: string;
  code: string;
  name: string;
  plant: string;
  type: string;
  is_active: number;
}

export function FurnaceManagementView() {
  const [rows, setRows] = useState<FurnaceRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", type: "EAF", plant: "JSPL" });
  const furnaceId = useOpsContextStore((s) => s.furnaceId);
  const setFurnaceId = useOpsContextStore((s) => s.setFurnaceId);

  const load = () => {
    opsApi
      .furnaces()
      .then(({ data }) => setRows(data as FurnaceRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load furnaces")));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await opsApi.createFurnace(form);
      setForm({ code: "", name: "", type: "EAF", plant: "JSPL" });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create furnace"));
    }
  };

  return (
    <PageContainer
      title="Furnace Management"
      description="Multi-furnace registry (EAF-1, EAF-2, LF-1, …)"
      meta={`Dashboard & heat sync use · ${furnaceId}`}
    >
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}

      <SectionCard title="Active furnace filter" description="Sets the plant context used across Live Board and Queue">
        <div className="flex flex-wrap gap-2">
          {rows.map((f) => (
            <Button
              key={f.id}
              variant={furnaceId === f.code ? "default" : "outline"}
              size="sm"
              onClick={() => setFurnaceId(f.code)}
            >
              {f.code}
            </Button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Register furnace">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="EAF-3" />
          </div>
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          </div>
          <div>
            <Label>Plant</Label>
            <Input value={form.plant} onChange={(e) => setForm({ ...form, plant: e.target.value })} />
          </div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Add furnace</Button>
      </SectionCard>

      <SectionCard title="Furnaces">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Code</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Name</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Type</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Plant</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Context</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell className="font-medium">{r.code}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.name}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.type}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.plant}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  {furnaceId === r.code ? <Badge variant="success">Active</Badge> : (
                    <Button size="sm" variant="ghost" onClick={() => setFurnaceId(r.code)}>Use</Button>
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
