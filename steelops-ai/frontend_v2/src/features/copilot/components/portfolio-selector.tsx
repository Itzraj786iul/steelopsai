"use client";

import { PORTFOLIO_ORDER } from "@/features/preheat/utils/preheat-utils";
import type { PortfolioSlot } from "@/stores/copilot-store";

const OPTIONS: Array<{ slot: PortfolioSlot; label: string }> = [
  { slot: "recommended", label: "Recommended" },
  ...PORTFOLIO_ORDER.map((entry) => ({ slot: entry.slot as PortfolioSlot, label: entry.label })),
];

interface PortfolioSelectorProps {
  selected: PortfolioSlot;
  onChange: (slot: PortfolioSlot) => void;
}

export function PortfolioSelector({ selected, onChange }: PortfolioSelectorProps) {
  return (
    <div>
      <p className="text-label mb-2">Portfolio switcher</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.slot}
            type="button"
            onClick={() => onChange(option.slot)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              selected === option.slot
                ? "border-primary bg-primary/15 text-primary"
                : "border-border/70 bg-muted/20 hover:border-primary/40"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
