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
import { useAuth } from "@/hooks/use-auth";
import { getApiErrorMessage } from "@/services/api-client";

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  category: string;
  audience_role?: string;
  created_at: string;
}

export function AnnouncementsView() {
  const { user } = useAuth();
  const canPublish = user?.role === "admin" || user?.role === "plant_manager" || user?.role === "production_manager";
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "Production",
    audience_role: "",
  });

  const load = () => {
    opsApi
      .announcements()
      .then(({ data }) => setRows(data as AnnouncementRow[]))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load announcements")));
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async () => {
    try {
      await opsApi.createAnnouncement({
        ...form,
        audience_role: form.audience_role || null,
      });
      setForm({ title: "", body: "", category: "Production", audience_role: "" });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Publish failed"));
    }
  };

  return (
    <PageContainer title="Announcements" description="Maintenance notices, production notices, safety alerts">
      {canPublish ? (
        <SectionCard title="Publish">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Announcement", "Maintenance", "Production", "Safety"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Body</Label>
              <Input value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </div>
            <div>
              <Label>Audience role (optional)</Label>
              <Input
                value={form.audience_role}
                onChange={(e) => setForm({ ...form, audience_role: e.target.value })}
                placeholder="operator / leave blank for all"
              />
            </div>
          </div>
          <Button className="mt-4" onClick={() => void publish()}>Publish</Button>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Visible announcements">
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableRow>
              <EnterpriseTableHeaderCell>Category</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Title</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Body</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>When</EnterpriseTableHeaderCell>
            </EnterpriseTableRow>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {rows.map((r) => (
              <EnterpriseTableRow key={r.id}>
                <EnterpriseTableCell>{r.category}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.title}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.body}</EnterpriseTableCell>
                <EnterpriseTableCell>{r.created_at?.slice(0, 16)}</EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
