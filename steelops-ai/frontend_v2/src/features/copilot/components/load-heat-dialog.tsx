"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadHeatRow {
  heatId: string;
  heatNumber: string;
  operator: string;
  shift: string;
  status: string;
}

interface LoadHeatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: LoadHeatRow[];
  onSelect: (heatId: string) => void;
}

export function LoadHeatDialog({ open, onOpenChange, rows, onSelect }: LoadHeatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Select mission heat
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a planned heat from today&apos;s schedule to open in the mission workspace.
          </p>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
          {rows.map((row) => (
            <button
              key={row.heatId}
              type="button"
              onClick={() => {
                onSelect(row.heatId);
                onOpenChange(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3 text-left",
                "transition-colors hover:border-primary/50 hover:bg-primary/5 focus-ring"
              )}
            >
              <div>
                <p className="font-medium">{row.heatNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {row.operator} · Shift {row.shift}
                </p>
              </div>
              <StatusBadge status={row.status} />
            </button>
          ))}
          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 py-10 text-center text-sm text-muted-foreground">
              No scheduled heats for this shift.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
