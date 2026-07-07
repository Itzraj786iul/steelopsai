"use client";

import { Settings, Wifi, WifiOff } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/layout/section-card";
import type { IntegrationDef, IntegrationStatus } from "@/features/onboarding/utils/onboarding-data";
import { INTEGRATIONS } from "@/features/onboarding/utils/onboarding-data";
import { cn } from "@/lib/utils";

const statusLabel: Record<IntegrationStatus, string> = {
  connected: "Connected",
  pending: "Pending",
  offline: "Offline",
};

const statusVariant: Record<IntegrationStatus, "default" | "secondary" | "destructive"> = {
  connected: "default",
  pending: "secondary",
  offline: "destructive",
};

function IntegrationCard({ item }: { item: IntegrationDef }) {
  const Icon = item.status === "offline" ? WifiOff : Wifi;
  return (
    <article className="flex flex-col rounded-xl border border-border/60 bg-card p-5 transition-shadow hover:shadow-elevation-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.category}</p>
          <h3 className="mt-1 text-heading-sm">{item.name}</h3>
        </div>
        <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted-foreground">{item.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <Icon className={cn("h-4 w-4", item.status === "connected" ? "text-accent" : "text-muted-foreground")} />
        <ActionButton variant="outline" size="sm">
          <Settings className="h-3 w-3" />
          Configure
        </ActionButton>
      </div>
    </article>
  );
}

export function IntegrationCenter() {
  return (
    <SectionCard title="Integration center" description="Connect plant systems to SteelOps AI">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((item) => (
          <IntegrationCard key={item.id} item={item} />
        ))}
      </div>
    </SectionCard>
  );
}
