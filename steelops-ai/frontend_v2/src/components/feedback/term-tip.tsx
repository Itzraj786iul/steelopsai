"use client";

import { HelpCircle } from "lucide-react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { GlossaryTerm } from "@/lib/eaf-glossary";
import { cn } from "@/lib/utils";

interface TermTipProps {
  term: GlossaryTerm;
  /** Inline text; defaults to plain (CODE). */
  children?: React.ReactNode;
  className?: string;
}

/** Hover/focus tip for industrial jargon. */
export function TermTip({ term, children, className }: TermTipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 border-b border-dotted border-muted-foreground/50 text-left font-medium text-foreground hover:border-primary hover:text-primary",
              className
            )}
          >
            {children ?? (
              <>
                {term.plain}{" "}
                <span className="font-mono text-xs text-muted-foreground">({term.code})</span>
              </>
            )}
            <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs space-y-1.5 p-3 text-left">
          <p className="font-semibold text-foreground">
            {term.plain} · {term.code}
          </p>
          <p className="leading-relaxed text-muted-foreground">{term.meaning}</p>
          {term.example ? <p className="text-muted-foreground/90 italic">{term.example}</p> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
