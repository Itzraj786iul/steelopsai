"use client";

import { AlertTriangle } from "lucide-react";

import { humanizeWarning } from "@/lib/humanize-warning";
import { cn } from "@/lib/utils";

interface ValidationBannerProps {
  messages: string[];
  className?: string;
}

export function ValidationBanner({ messages, className }: ValidationBannerProps) {
  if (!messages.length) return null;

  const display = messages.map(humanizeWarning);

  return (
    <div className={cn("mt-4 space-y-2", className)}>
      {display.map((message) => (
        <p
          key={message}
          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{message}</span>
        </p>
      ))}
    </div>
  );
}

interface OptimizerDisclaimerProps {
  className?: string;
}

export function OptimizerDisclaimer({ className }: OptimizerDisclaimerProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <p className="font-medium text-foreground">Production optimizer</p>
      <p className="mt-1 leading-relaxed">
        Recommendations use the deployed plant model. Review suggested burden changes, then Accept, Modify, or
        Reject before validation.
      </p>
    </div>
  );
}
