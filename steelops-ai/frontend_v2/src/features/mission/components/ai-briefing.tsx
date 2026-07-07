"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Lightbulb, Target, X } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import type { MissionBriefing } from "@/features/mission/utils/mission-utils";
import { useDecisionModeStore } from "@/stores/decision-mode-store";

interface AIBriefingProps {
  briefing: MissionBriefing;
}

export const AIBriefing = memo(function AIBriefing({ briefing }: AIBriefingProps) {
  const { briefingDismissed, dismissBriefing } = useDecisionModeStore();

  if (briefingDismissed) return null;

  return (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="glass-panel rounded-2xl p-6"
      aria-label="AI briefing"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-label">AI briefing</p>
          <h2 className="text-heading-md">Your shift at a glance</h2>
        </div>
        <ActionButton variant="ghost" size="icon" onClick={dismissBriefing} aria-label="Dismiss briefing">
          <X className="h-4 w-4" />
        </ActionButton>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BriefBlock icon={Target} title="Today's objective" items={[briefing.objective]} />
        <BriefBlock icon={Lightbulb} title="Opportunities" items={briefing.opportunities} accent />
        <BriefBlock icon={AlertTriangle} title="Bottlenecks" items={briefing.bottlenecks} warn />
        <BriefBlock icon={AlertTriangle} title="Risks" items={briefing.risks} warn />
      </div>

      {(briefing.maintenanceWarnings.length > 0 || briefing.inventoryWarnings.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
          {[...briefing.maintenanceWarnings, ...briefing.inventoryWarnings].map((w) => (
            <span key={w} className="rounded-full border border-border/60 px-3 py-1">
              {w}
            </span>
          ))}
        </div>
      )}
    </motion.section>
  );
});

function BriefBlock({
  icon: Icon,
  title,
  items,
  accent,
  warn,
}: {
  icon: typeof Target;
  title: string;
  items: string[];
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent ? "text-accent" : warn ? "text-warning" : "text-primary"}`} />
        <p className="text-sm font-medium">{title}</p>
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}
