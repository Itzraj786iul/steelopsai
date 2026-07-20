"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type PageAlertTone = "error" | "warning" | "success" | "info";

interface PageAlertProps {
  tone?: PageAlertTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const TONE: Record<
  PageAlertTone,
  { wrap: string; icon: typeof Info }
> = {
  error: {
    wrap: "border-destructive/30 bg-destructive/5 text-destructive",
    icon: XCircle,
  },
  warning: {
    wrap: "border-warning/40 bg-warning/10 text-foreground",
    icon: AlertTriangle,
  },
  success: {
    wrap: "border-success/30 bg-success/5 text-foreground",
    icon: CheckCircle2,
  },
  info: {
    wrap: "border-info/30 bg-info/5 text-foreground",
    icon: Info,
  },
};

/** Consistent inline page callouts (errors, session complete, hints). */
export function PageAlert({ tone = "info", title, children, className, actions }: PageAlertProps) {
  const { wrap, icon: Icon } = TONE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        wrap,
        className
      )}
    >
      <div className="flex min-w-0 gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <div className="min-w-0 space-y-0.5 text-sm">
          {title ? <p className="font-medium text-foreground">{title}</p> : null}
          <div className={cn(!title && "text-inherit", title && "text-muted-foreground")}>{children}</div>
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
