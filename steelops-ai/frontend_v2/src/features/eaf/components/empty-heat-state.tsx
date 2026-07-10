"use client";

import { AlertCircle } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { INDUSTRIAL_STATUS } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";

interface EmptyHeatStateProps {
  title?: string;
  description?: string;
  /** `panel` = right status rail; `page` = main workflow pages; `inline` = dashboard cards */
  variant?: "panel" | "page" | "inline";
  className?: string;
}

const PAGE_HINT =
  "Use New Heat in the header, then complete Prediction from the sidebar before using this page.";

const PANEL_HINT = "No active heat. Start with New Heat in the header.";

export function EmptyHeatState({
  title = "No Active Heat",
  description,
  variant = "page",
  className,
}: EmptyHeatStateProps) {
  const hint = description ?? (variant === "panel" ? PANEL_HINT : PAGE_HINT);

  if (variant === "panel" || variant === "inline") {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed p-4",
          INDUSTRIAL_STATUS.historical.className,
          className
        )}
      >
        <div className="flex items-start gap-2 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-muted-foreground">{hint}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SectionCard title={title} className={cn("border-dashed", className)}>
      <div className="flex items-start gap-3 py-4">
        <AlertCircle className="h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />
        <p className="max-w-lg text-sm text-muted-foreground">{hint}</p>
      </div>
    </SectionCard>
  );
}
