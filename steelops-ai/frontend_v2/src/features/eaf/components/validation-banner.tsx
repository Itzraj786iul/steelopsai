"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";

interface ValidationBannerProps {
  messages: string[];
  className?: string;
}

export function ValidationBanner({ messages, className }: ValidationBannerProps) {
  if (!messages.length) return null;

  return (
    <div className={cn("mt-4 space-y-2", className)}>
      {messages.map((message) => (
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
      <p className="font-medium text-foreground">Production optimizer notice</p>
      <p className="mt-1 leading-relaxed">
        The current optimizer follows the deployed Phase 19 production model. Research has identified{" "}
        <strong className="text-foreground">Electrical Energy (kWh)</strong> as a retrospective variable recorded
        after heat completion. Future optimizer versions will replace this with planning-stage variables once
        industrially validated sensors are available. No optimization logic has changed in this release.
      </p>
    </div>
  );
}
