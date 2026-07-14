"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Search } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { eafApi, type HeatRecord } from "@/lib/api/eaf";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/services/api-client";

const STATUSES = ["Draft", "Predicted", "Optimized", "Accepted", "Running", "Completed", "Validated", "Archived"];
const SHIFTS = ["A", "B", "C"];
const PERIODS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function statusClass(status: string): string {
  if (status === "Validated" || status === "Accepted" || status === "Completed") return INDUSTRIAL_STATUS.validated.className;
  if (status === "Predicted" || status === "Optimized" || status === "Running") return INDUSTRIAL_STATUS.prediction.className;
  if (status === "Archived") return INDUSTRIAL_STATUS.historical.className;
  return INDUSTRIAL_STATUS.warning.className;
}

export function HeatHistoryView() {
  const router = useRouter();
  const [items, setItems] = useState<HeatRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [shift, setShift] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [period, setPeriod] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Re-push any heats still held in this browser's session history into SQLite
      // (recovers rows lost when upsert incorrectly keyed on heat_number).
      try {
        const { recoverSessionHistoryToServer } = await import("@/lib/heat-history-sync");
        await recoverSessionHistoryToServer();
      } catch {
        /* non-fatal */
      }
      const { data } = await eafApi.heatsList({
        q: q || undefined,
        shift: shift === "all" ? undefined : shift,
        status: status === "all" ? undefined : status,
        period: period === "all" ? undefined : period,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: 25,
      });
      setItems(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to load heat history"));
    } finally {
      setLoading(false);
    }
  }, [q, shift, status, period, sortBy, sortDir, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportFmt = async (format: "csv" | "json" | "excel" | "pdf") => {
    const { data } = await eafApi.heatsExport({
      format,
      q: q || undefined,
      shift: shift === "all" ? undefined : shift,
      status: status === "all" ? undefined : status,
      period: period === "all" ? undefined : period,
    });
    const blob =
      format === "json"
        ? new Blob([typeof data === "string" ? data : JSON.stringify(data)], { type: "application/json" })
        : (data as Blob);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heat_history.${format === "excel" ? "xlsx" : format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  return (
    <PageContainer
      title="Heat History"
      description="Permanent production records for every heat processed in the platform"
    >
      <SectionCard title="Filters" className="mt-2">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="heat-search">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="heat-search"
                className="pl-8"
                placeholder="Heat number, operator…"
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
          </div>
          <FilterSelect label="Period" value={period} onChange={(v) => { setPage(1); setPeriod(v); }} options={PERIODS.map((p) => ({ value: p.value, label: p.label }))} />
          <FilterSelect label="Shift" value={shift} onChange={(v) => { setPage(1); setShift(v); }} options={[{ value: "all", label: "All" }, ...SHIFTS.map((s) => ({ value: s, label: `Shift ${s}` }))]} />
          <FilterSelect label="Status" value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[{ value: "all", label: "All" }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void exportFmt("csv")}>
              <Download className="mr-1 h-3.5 w-3.5" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => void exportFmt("excel")}>
              <Download className="mr-1 h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => void exportFmt("json")}>
              <Download className="mr-1 h-3.5 w-3.5" /> JSON
            </Button>
            <Button size="sm" variant="outline" onClick={() => void exportFmt("pdf")}>
              <Download className="mr-1 h-3.5 w-3.5" /> PDF
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Production table (${total} heats)`} className="mt-6">
        {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading heat records…</p>
        ) : !items.length ? (
          <p className="text-sm text-muted-foreground">No heats in the database yet. Run a prediction to create the first record.</p>
        ) : (
          <>
            <EnterpriseTable>
              <EnterpriseTableHead>
                <EnterpriseTableHeaderCell>
                  <button type="button" className="font-medium" onClick={() => toggleSort("heat_number")}>
                    Heat
                  </button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("date")}>Date</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("shift")}>Shift</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("status")}>Status</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("predicted_ttt")}>Pred TTT</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("actual_ttt")}>Actual</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("prediction_error")}>Error</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("expected_saving")}>Saving</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Reliability</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Recommendation</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Operator</EnterpriseTableHeaderCell>
              </EnterpriseTableHead>
              <EnterpriseTableBody>
                {items.map((h) => (
                  <EnterpriseTableRow
                    key={h.id}
                    interactive
                    onClick={() => router.push(`/eaf/heats/${encodeURIComponent(h.heat_number || h.id)}`)}
                  >
                    <EnterpriseTableCell mono>{h.heat_number}</EnterpriseTableCell>
                    <EnterpriseTableCell>{h.date}</EnterpriseTableCell>
                    <EnterpriseTableCell>{h.shift}</EnterpriseTableCell>
                    <EnterpriseTableCell>
                      <Badge className={cn(statusClass(h.status))}>{h.status}</Badge>
                    </EnterpriseTableCell>
                    <EnterpriseTableCell mono>
                      {h.predicted_ttt != null ? h.predicted_ttt.toFixed(2) : "—"}
                    </EnterpriseTableCell>
                    <EnterpriseTableCell mono>
                      {h.actual_ttt != null ? h.actual_ttt.toFixed(2) : "—"}
                    </EnterpriseTableCell>
                    <EnterpriseTableCell mono>
                      {h.prediction_error != null ? h.prediction_error.toFixed(2) : "—"}
                    </EnterpriseTableCell>
                    <EnterpriseTableCell mono>
                      {h.expected_saving != null ? h.expected_saving.toFixed(2) : "—"}
                    </EnterpriseTableCell>
                    <EnterpriseTableCell mono>
                      {h.reliability_index != null ? h.reliability_index.toFixed(1) : "—"}
                    </EnterpriseTableCell>
                    <EnterpriseTableCell>{h.recommendation_status || "—"}</EnterpriseTableCell>
                    <EnterpriseTableCell>{h.operator_name || "—"}</EnterpriseTableCell>
                  </EnterpriseTableRow>
                ))}
              </EnterpriseTableBody>
            </EnterpriseTable>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pages}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </PageContainer>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="w-[140px]">
      <label className="mb-1 block text-xs text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
