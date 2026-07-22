"use client";

import { useState } from "react";
import { ChevronDown, Lightbulb } from "lucide-react";

import { cn } from "@/lib/utils";

interface PageExplainerProps {
  title: string;
  body: string;
  steps?: readonly string[];
  className?: string;
  /** Prefer collapsed on floor pages so the work surface stays first. */
  defaultOpen?: boolean;
}

/** Collapsible plain-language intro — collapsed by default so operators see the task first. */
export function PageExplainer({
  title,
  body,
  steps,
  className,
  defaultOpen = false,
}: PageExplainerProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-info/25 bg-info/5",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-info/10"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
          <Lightbulb className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          {!open ? (
            <span className="block truncate text-xs text-muted-foreground">Tap to learn what this page does</span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-info/15 px-4 pb-4 pt-3 text-sm leading-relaxed text-muted-foreground">
          <p>{body}</p>
          {steps?.length ? (
            <ol className="list-decimal space-y-1.5 pl-5 text-foreground/90">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
