"use client";

import Link from "next/link";
import { CheckCircle2, Edit3, Lock, XCircle, ArrowRight } from "lucide-react";

import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RECIPE_FIELD_LABELS } from "@/lib/eaf-labels";
import { INDUSTRIAL_STATUS, acceptanceStatus } from "@/lib/industrial-colors";
import { cn } from "@/lib/utils";
import {
  useCurrentHeatStore,
  type RecommendationAcceptanceStatus,
} from "@/stores/current-heat-store";
import type { EafRecipe } from "@/lib/api/eaf";

const MODIFY_KEYS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY"] as const;

interface RecommendationAcceptancePanelProps {
  disabled?: boolean;
}

export function RecommendationAcceptancePanel({ disabled }: RecommendationAcceptancePanelProps) {
  const active = useCurrentHeatStore((s) => s.active);
  const setRecommendationAcceptance = useCurrentHeatStore((s) => s.setRecommendationAcceptance);
  const confirmRecommendation = useCurrentHeatStore((s) => s.confirmRecommendation);
  const setRecommendationNotes = useCurrentHeatStore((s) => s.setRecommendationNotes);
  const setModifiedRecipeField = useCurrentHeatStore((s) => s.setModifiedRecipeField);

  if (!active?.optimizer) return null;

  const status = active.recommendationAcceptance;
  const locked = active.recommendationLocked;
  const notes = active.recommendationNotes ?? "";
  const statusKey = acceptanceStatus(status);
  const optimized = active.optimizer.optimized_recipe;
  const current = active.recipe;
  const modified = active.modifiedRecipe;

  const notesReady = notes.trim().length >= 3;
  const canConfirm =
    !!status &&
    (status === "Accepted" || notesReady) &&
    !locked;
  const canProceedToValidation = locked && !!status && (status === "Accepted" || notesReady);

  const select = (next: RecommendationAcceptanceStatus) => {
    if (disabled || locked) return;
    if (next === "Accepted") {
      setRecommendationAcceptance("Accepted", { notes, lock: true });
      return;
    }
    if (next === "Modified") {
      setRecommendationAcceptance("Modified", {
        notes,
        modifiedRecipe: { ...optimized },
        lock: false,
      });
      return;
    }
    setRecommendationAcceptance("Rejected", { notes, lock: false });
  };

  const confirm = () => {
    if (!canConfirm) return;
    confirmRecommendation();
  };

  return (
    <SectionCard
      title="Operator Recommendation Review"
      description="Choose Accept, Modify, or Reject. Modify/Reject need a short reason before the decision is locked."
    >
      {status && locked ? (
        <div className={cn("mb-4 flex flex-wrap items-center gap-2 rounded-lg border p-3", INDUSTRIAL_STATUS[statusKey].className)}>
          {status === "Accepted" ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : status === "Modified" ? (
            <Edit3 className="h-4 w-4" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden />
          )}
          <span className="font-medium">Status: {status}</span>
          <Badge variant="outline" className="gap-1">
            <Lock className="h-3 w-3" aria-hidden />
            Locked
          </Badge>
        </div>
      ) : status ? (
        <div className={cn("mb-4 flex flex-wrap items-center gap-2 rounded-lg border p-3", INDUSTRIAL_STATUS[statusKey].className)}>
          <span className="font-medium">Selected: {status}</span>
          <Badge variant="outline">Not locked yet — enter reason below</Badge>
        </div>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">
          Choose one action. You can switch until the decision is confirmed.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <AcceptButton
          label="Accept"
          icon={CheckCircle2}
          variant="validated"
          onClick={() => select("Accepted")}
          disabled={disabled || locked}
          active={status === "Accepted"}
        />
        <AcceptButton
          label="Modify"
          icon={Edit3}
          variant="warning"
          onClick={() => select("Modified")}
          disabled={disabled || locked}
          active={status === "Modified"}
        />
        <AcceptButton
          label="Reject"
          icon={XCircle}
          variant="critical"
          onClick={() => select("Rejected")}
          disabled={disabled || locked}
          active={status === "Rejected"}
        />
      </div>

      {locked && status === "Accepted" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Optimizer recommendation accepted as-is. Optional note for the permanent heat record:
          </p>
          <NotesField
            label="Operator note (optional)"
            value={notes}
            onChange={setRecommendationNotes}
            placeholder="e.g. Applied optimized oxygen trim"
          />
        </div>
      ) : null}

      {status === "Rejected" ? (
        <div className="mt-4 space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-sm font-medium">
            {locked ? "Rejection reason" : "Rejection reason (required to lock)"}
          </p>
          <NotesField
            label="Why was the recommendation rejected?"
            value={notes}
            onChange={setRecommendationNotes}
            placeholder="e.g. Charge mix constrained by HM availability"
            required
            disabled={locked}
          />
        </div>
      ) : null}

      {status === "Modified" ? (
        <div className="mt-4 space-y-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div>
            <p className="text-sm font-medium">Record the modification you will run</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Values start from the optimizer recommendation. Adjust what you changed vs current input.
            </p>
          </div>

          <div className="-mx-1 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Variable</th>
                  <th className="px-2 py-2 font-medium">Current</th>
                  <th className="px-2 py-2 font-medium">Optimized</th>
                  <th className="px-2 py-2 font-medium">Your modified</th>
                </tr>
              </thead>
              <tbody>
                {MODIFY_KEYS.map((key) => {
                  const digits = key === "OXY" || key === "CPC" ? 0 : 1;
                  const modVal = modified?.[key] ?? optimized[key];
                  return (
                    <tr key={key} className="border-t border-border/40">
                      <td className="px-2 py-2 text-muted-foreground">{RECIPE_FIELD_LABELS[key] ?? key}</td>
                      <td className="px-2 py-2 font-mono">{fmt(current[key], digits)}</td>
                      <td className="px-2 py-2 font-mono">{fmt(optimized[key], digits)}</td>
                      <td className="px-2 py-2">
                        <Input
                          type="number"
                          step={digits === 0 ? 1 : 0.1}
                          className="h-8 font-mono"
                          disabled={locked}
                          value={Number.isFinite(modVal) ? modVal : ""}
                          onChange={(e) => {
                            const n = parseFloat(e.target.value);
                            if (!Number.isNaN(n)) setModifiedRecipeField(key, n as EafRecipe[typeof key]);
                          }}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <NotesField
            label="What did you change? (required to lock)"
            value={notes}
            onChange={setRecommendationNotes}
            placeholder="e.g. Kept current LIME, reduced OXY by 50 Nm³ vs optimized"
            required
            disabled={locked}
          />
        </div>
      ) : null}

      {!locked && (status === "Rejected" || status === "Modified") ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {notesReady
              ? "Reason entered — confirm to lock this decision."
              : status === "Rejected"
                ? "Enter rejection reason (min 3 characters), then confirm."
                : "Enter modification notes (min 3 characters), then confirm."}
          </p>
          <Button onClick={confirm} disabled={!canConfirm || disabled} className="w-full sm:w-auto">
            {status === "Rejected" ? "Confirm rejection" : "Confirm modification"}
          </Button>
        </div>
      ) : null}

      {locked ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Decision locked. Next: record the actual cycle time (minutes) and save this heat permanently.
          </p>
          <Button asChild disabled={!canProceedToValidation} className="w-full sm:w-auto">
            <Link href="/eaf/validation">
              Continue to Validation
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}

function NotesField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <textarea
        className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-60"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

function AcceptButton({
  label,
  icon: Icon,
  variant,
  onClick,
  disabled,
  active,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "validated" | "warning" | "critical";
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const statusKey = variant === "validated" ? "validated" : variant === "warning" ? "warning" : "critical";
  return (
    <Button
      variant="outline"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        INDUSTRIAL_STATUS[statusKey].className,
        active && "ring-2 ring-offset-2 ring-offset-background",
        disabled && !active && "opacity-40"
      )}
    >
      <Icon className="mr-2 h-4 w-4" aria-hidden />
      {label}
    </Button>
  );
}

export function RecommendationAcceptanceBadge() {
  const status = useCurrentHeatStore((s) => s.active?.recommendationAcceptance);
  const locked = useCurrentHeatStore((s) => s.active?.recommendationLocked);
  if (!status) return null;
  const statusKey = acceptanceStatus(status);
  return (
    <Badge className={cn("gap-1", INDUSTRIAL_STATUS[statusKey].className)}>
      {locked ? <Lock className="h-3 w-3" aria-hidden /> : null}
      Recommendation: {status}
      {!locked ? " (draft)" : ""}
    </Badge>
  );
}
