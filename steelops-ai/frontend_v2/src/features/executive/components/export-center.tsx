"use client";

import { FileSpreadsheet, FileText, Link2, Presentation } from "lucide-react";
import { ActionButton } from "@/components/data-display/action-button";
import { VizPanel } from "@/components/industrial/primitives";
import type { ExecutiveSnapshot } from "@/features/executive/utils/executive-metrics";

export function ExportCenter({ snapshot }: { snapshot: ExecutiveSnapshot }) {
  const downloadSnapshot = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `steelops-executive-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareLink = async () => {
    const url = `${window.location.origin}/executive`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <VizPanel title="Export center" description="Board-ready outputs">
      <div className="flex flex-wrap gap-3">
        <ActionButton variant="outline" onClick={() => window.print()}>
          <FileText className="h-4 w-4" />
          Executive PDF
        </ActionButton>
        <ActionButton variant="outline" onClick={() => window.print()}>
          <Presentation className="h-4 w-4" />
          Board deck
        </ActionButton>
        <ActionButton variant="outline" onClick={downloadSnapshot}>
          <FileSpreadsheet className="h-4 w-4" />
          Excel snapshot
        </ActionButton>
        <ActionButton variant="outline" onClick={downloadSnapshot}>
          JSON snapshot
        </ActionButton>
        <ActionButton variant="outline" onClick={() => void shareLink()}>
          <Link2 className="h-4 w-4" />
          Share link
        </ActionButton>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Use browser print for PDF/PPT layout. Data snapshot exports current KPIs.</p>
    </VizPanel>
  );
}
