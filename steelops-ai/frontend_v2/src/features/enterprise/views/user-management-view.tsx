"use client";

import { useCallback, useEffect, useState } from "react";

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
import { eafClient } from "@/lib/api/eaf";
import type { User } from "@/types";
import { getApiErrorMessage } from "@/services/api-client";

const ROLES = [
  "admin",
  "plant_manager",
  "production_manager",
  "shift_engineer",
  "operator",
  "quality_engineer",
  "maintenance_engineer",
  "data_scientist",
  "viewer",
];

export function UserManagementView() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "operator",
    shift: "",
  });

  const load = useCallback(() => {
    eafClient
      .get<User[]>("/admin/users")
      .then(({ data }) => setUsers(data))
      .catch((e: unknown) => setError(getApiErrorMessage(e, "Failed to load users")));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setError(null);
    try {
      await eafClient.post("/admin/users", {
        ...form,
        shift: form.shift || null,
      });
      setForm({ email: "", full_name: "", password: "", role: "operator", shift: "" });
      load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to create user"));
    }
  };

  const toggleActive = async (u: User) => {
    await eafClient.patch(`/admin/users/${u.id}`, { is_active: !u.is_active });
    load();
  };

  return (
    <PageContainer title="User Management" description="Create users, assign roles and shifts">
      {error ? <PageAlert tone="error">{error}</PageAlert> : null}
      <SectionCard title="Create user" description="New accounts are active immediately">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={form.shift || "none"} onValueChange={(v) => setForm({ ...form, shift: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button className="mt-4" onClick={() => void create()}>Create user</Button>
      </SectionCard>

      <SectionCard title={`Users (${users.length})`}>
        <EnterpriseTable>
          <EnterpriseTableHead>
            <EnterpriseTableHeaderCell>Name</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Email</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Role</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Shift</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Status</EnterpriseTableHeaderCell>
            <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
          </EnterpriseTableHead>
          <EnterpriseTableBody>
            {users.map((u) => (
              <EnterpriseTableRow key={u.id}>
                <EnterpriseTableCell className="font-medium">{u.full_name}</EnterpriseTableCell>
                <EnterpriseTableCell>{u.email}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  <Badge variant="outline">{u.role}</Badge>
                </EnterpriseTableCell>
                <EnterpriseTableCell>{u.shift || "—"}</EnterpriseTableCell>
                <EnterpriseTableCell>
                  <Badge variant={u.is_active ? "success" : "muted"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                </EnterpriseTableCell>
                <EnterpriseTableCell>
                  <Button size="sm" variant="outline" onClick={() => void toggleActive(u)}>
                    {u.is_active ? "Disable" : "Enable"}
                  </Button>
                </EnterpriseTableCell>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </EnterpriseTable>
      </SectionCard>
    </PageContainer>
  );
}
