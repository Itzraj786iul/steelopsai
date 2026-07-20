"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageAlert } from "@/components/feedback/page-alert";
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
  const searchParams = useSearchParams();
  const [items, setItems] = useState<HeatRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState(() => searchParams.get("q") || searchParams.get("highlight") || "");
  const [shift, setShift] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [period, setPeriod] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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
      setSelected(new Set());
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

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((h) => h.id)));
  };

  const deleteOne = async (h: HeatRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    const label = h.heat_number || h.id;
    if (!window.confirm(`Permanently delete heat ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await eafApi.heatDelete(h.id);
      await load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete heat"));
    } finally {
      setDeleting(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Permanently delete ${ids.length} selected heat(s)? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    try {
      await eafApi.heatsBulkDelete(ids);
      await load();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to delete selected heats"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PageContainer
      title="Heat History"
      description="Permanent production records — delete test heats anytime"
    >
      <SectionCard title="Filters">
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
            {selected.size > 0 ? (
              <Button size="sm" variant="destructive" disabled={deleting} onClick={() => void deleteSelected()}>
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete ({selected.size})
              </Button>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={`Production table (${total} heats)`}>
        {error ? (
          <PageAlert
            tone="error"
            className="mb-3"
            title={
              /inactive|expired|sign in|Not authenticated|deactivated/i.test(error)
                ? "Cannot load saved heats — sign in again"
                : "Could not load Heat History"
            }
            actions={
              /inactive|expired|sign in|Not authenticated|deactivated/i.test(error) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void import("@/stores/auth-store").then(({ useAuthStore }) => {
                      useAuthStore.getState().clearAuth();
                      router.push("/login?next=/eaf/heat-history");
                    });
                  }}
                >
                  Sign in again
                </Button>
              ) : null
            }
          >
            {error}
            {/inactive|expired|sign in|Not authenticated|deactivated/i.test(error)
              ? " Your session no longer matches the server. Sign in again to see heats stored in the database."
              : null}
          </PageAlert>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading heat records…</p>
        ) : error ? null : !items.length ? (
          <EmptyState
            title="No heats yet"
            description="Run Predict cycle time once — each prediction is saved to the Heat History database and stays after you close the browser."
            actionLabel="Go to Predict"
            onAction={() => router.push("/eaf/prediction")}
            className="py-10"
          />
        ) : (
          <>
            <EnterpriseTable>
              <EnterpriseTableHead>
                <EnterpriseTableHeaderCell>
                  <input
                    type="checkbox"
                    aria-label="Select all on page"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleSelectAll}
                  />
                </EnterpriseTableHeaderCell>
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
                  <button type="button" onClick={() => toggleSort("predicted_ttt")}>Pred. cycle</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("actual_ttt")}>Actual</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>
                  <button type="button" onClick={() => toggleSort("prediction_error")}>Error</button>
                </EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Recommendation</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Operator</EnterpriseTableHeaderCell>
                <EnterpriseTableHeaderCell>Actions</EnterpriseTableHeaderCell>
              </EnterpriseTableHead>
              <EnterpriseTableBody>
                {items.map((h) => (
                  <EnterpriseTableRow
                    key={h.id}
                    interactive
                    onClick={() => router.push(`/eaf/heats/${encodeURIComponent(h.heat_number || h.id)}`)}
                  >
                    <EnterpriseTableCell>
                      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${h.heat_number}`}
                          checked={selected.has(h.id)}
                          onChange={() => toggleSelect(h.id)}
                        />
                      </div>
                    </EnterpriseTableCell>
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
                    <EnterpriseTableCell>{h.recommendation_status || "—"}</EnterpriseTableCell>
                    <EnterpriseTableCell>{h.operator_name || "—"}</EnterpriseTableCell>
                    <EnterpriseTableCell>
                      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deleting}
                          onClick={(e) => void deleteOne(h, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </EnterpriseTableCell>
                  </EnterpriseTableRow>
                ))}
              </EnterpriseTableBody>
            </EnterpriseTable>
            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {pages}
                {selected.size ? ` · ${selected.size} selected` : ""}
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
