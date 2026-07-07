"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Focus } from "lucide-react";
import { DECISION_MODE_LABELS, type DecisionMode } from "@/lib/human-language";
import { useDecisionModeStore } from "@/stores/decision-mode-store";
import { cn } from "@/lib/utils";

export function DecisionModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode, focusMode, toggleFocusMode } = useDecisionModeStore();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={mode} onValueChange={(v) => setMode(v as DecisionMode)}>
        <SelectTrigger className="hidden h-9 w-[148px] text-xs md:flex" aria-label="Decision mode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(DECISION_MODE_LABELS) as DecisionMode[]).map((key) => (
            <SelectItem key={key} value={key}>
              {DECISION_MODE_LABELS[key]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant={focusMode ? "default" : "outline"}
        size="icon"
        className="h-9 w-9"
        onClick={toggleFocusMode}
        aria-label="Operator focus mode"
        title="Focus mode"
      >
        <Focus className="h-4 w-4" />
      </Button>
    </div>
  );
}
