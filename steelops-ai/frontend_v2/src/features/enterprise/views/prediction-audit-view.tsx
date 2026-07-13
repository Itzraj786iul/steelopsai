"use client";

import { useMemo, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuditExportBar, downloadText } from "@/features/enterprise/components/audit-export-bar";
import {
  EnterpriseTable,
  EnterpriseTableBody,
  EnterpriseTableCell,
  EnterpriseTableHead,
  EnterpriseTableHeaderCell,
  EnterpriseTableRow,
} from "@/features/enterprise/components/enterprise-table";
import { SHIFTS } from "@/lib/constants";
import { useAuditStore } from "@/stores/audit-store";

export function PredictionAuditView() {
  const records = useAuditStore((s) => s.predictionAudits);
  const [heatFilter, setHeatFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (heatFilter && !r.heatNumber.toLowerCase().includes(heatFilter.toLowerCase())) return false;
      if (shiftFilter !== "all" && r.shift !== shiftFilter) return false;
      if (statusFilter !== "all" && r.validationStatus !== statusFilter) return false;
      return true;
    });
  }, [records, heatFilter, shiftFilter, statusFilter]);

  const exportCsv = () => {
    const headers = ["timestamp", "heatNumber", "shift", "predictedTtt", "confidence", "similarity", "modelVersion", "operatorDecision", "validationStatus"];
    const rows = filtered.map((r) =>
      headers.map((h) => {
        const val = r[h as keyof typeof r];
        return String(val ?? "");
      }).join(",")
    );
    downloadText([headers.join(","), ...rows].join("\n"), `prediction_audit_${Date.now()}.csv`, "text/csv");
  };

  return (
    <PageContainer title="Prediction Audit" description="Permane  nt audit trail for every prediction — client-side store">
      <SectionCard title="Search & Filters">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="heat-filter">Heat Number</Label>
            <Input id="heat-filter" className="mt-1" value={heatFilter} onChange={(e) => setHeatFilter(e.target.value)} placeholder="Search heat" />
          </div>
          <div>
            <Label>Shift</Label>
            <Select value={shiftFilter} onValueChange={setShiftFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All shifts</SelectItem>
                {SHIFTS.map((s) => <SelectItem key={s} value={s}>Shift {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Validation Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Validated">Validated</SelectItem>
                <SelectItem value="Recorded">Recorded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4">
          <AuditExportBar
            disabled={!filtered.length}
            onExportJson={() => downloadText(JSON.stringify(filtered, null, 2), `prediction_audit_${Date.now()}.json`, "application/json")}
            onExportCsv={exportCsv}
          />
        </div>
      </SectionCard>

      <SectionCard title="Audit Records" className="mt-6">
        {!filtered.length ? (
          <p className="text-sm text-muted-foreground">No prediction audit records yet. Run a prediction to create the first entry.</p>
        ) : (
          <EnterpriseTable>
            <EnterpriseTableHead>
              <EnterpriseTableHeaderCell>Timestamp</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Heat</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Shift</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>TTT</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Confidence</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Similarity</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Model</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Decision</EnterpriseTableHeaderCell>
              <EnterpriseTableHeaderCell>Validation</EnterpriseTableHeaderCell>
            </EnterpriseTableHead>
            <EnterpriseTableBody>
              {filtered.map((r) => (
                <EnterpriseTableRow key={r.id}>
                  <EnterpriseTableCell>{new Date(r.timestamp).toLocaleString()}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.heatNumber || "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.shift}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.predictedTtt.toFixed(2)}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.confidence ?? "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.similarity != null ? `${r.similarity.toFixed(0)}%` : "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell mono>{r.modelVersion}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.operatorDecision ?? "—"}</EnterpriseTableCell>
                  <EnterpriseTableCell>{r.validationStatus}</EnterpriseTableCell>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </EnterpriseTable>
        )}
      </SectionCard>
    </PageContainer>
  );
}
