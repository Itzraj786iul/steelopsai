"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AuditExportBar({
  onExportJson,
  onExportCsv,
  disabled,
}: {
  onExportJson: () => void;
  onExportCsv: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Export audit records">
      <Button size="sm" variant="outline" disabled={disabled} onClick={onExportJson}>
        <Download className="mr-2 h-4 w-4" aria-hidden />
        Export JSON
      </Button>
      <Button size="sm" variant="outline" disabled={disabled} onClick={onExportCsv}>
        <Download className="mr-2 h-4 w-4" aria-hidden />
        Export CSV
      </Button>
    </div>
  );
}

export function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
