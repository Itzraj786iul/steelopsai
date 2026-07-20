"use client";

import { HelpCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FieldGuide } from "@/lib/eaf-glossary";
import { cn } from "@/lib/utils";

interface GuidedNumberFieldProps {
  guide: FieldGuide;
  id: string;
  value: string;
  onChange: (raw: string) => void;
  onBlur?: () => void;
  /** Apply a known-good demo/suggested number into the field */
  onUseSuggested?: (value: number) => void;
  suggestedValue?: number;
  step?: string;
  min?: number;
  disabled?: boolean;
  className?: string;
  /** Soft out-of-range hint */
  outOfRange?: boolean;
}

/** Number input with plain name, unit, why-tooltip, and typical range. */
export function GuidedNumberField({
  guide,
  id,
  value,
  onChange,
  onBlur,
  onUseSuggested,
  suggestedValue,
  step,
  min = 0,
  disabled,
  className,
  outOfRange,
}: GuidedNumberFieldProps) {
  return (
    <div className={cn("space-y-1.5 rounded-lg border border-border/50 bg-muted/10 p-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <Label htmlFor={id} className="leading-snug">
          <span className="block text-sm font-semibold text-foreground">{guide.plain}</span>
          <span className="text-[11px] font-normal text-muted-foreground">
            Plant code: {guide.code} · Unit: {guide.unit}
          </span>
        </Label>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="mt-0.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`About ${guide.plain}`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs space-y-1.5 p-3 text-left">
              <p className="font-semibold">{guide.plain}</p>
              <p className="leading-relaxed text-muted-foreground">{guide.why}</p>
              <p className="text-muted-foreground">{guide.typical}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        placeholder={guide.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={cn("bg-background", outOfRange && "border-warning/60 focus-visible:ring-warning/40")}
        aria-describedby={`${id}-hint`}
      />
      <div id={`${id}-hint`} className="space-y-1">
        <p className={cn("text-[11px] leading-snug text-muted-foreground", outOfRange && "text-warning")}>
          {guide.typical}
          {outOfRange ? " · This looks unusual — double-check or use the suggested value." : ""}
        </p>
        {suggestedValue != null && onUseSuggested && !disabled ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-primary"
            onClick={() => onUseSuggested(suggestedValue)}
          >
            Use suggested {suggestedValue}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
