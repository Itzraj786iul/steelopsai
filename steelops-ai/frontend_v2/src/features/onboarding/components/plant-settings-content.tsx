"use client";

import { useOnboardingStore } from "@/stores/onboarding-store";

export function PlantSettingsContent() {
  const installation = useOnboardingStore((s) => s.installation);
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted-foreground">Plant</dt>
        <dd className="font-medium">{installation.plantName}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Furnaces</dt>
        <dd className="font-medium">{installation.furnaces}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Shifts</dt>
        <dd className="font-medium">{installation.shifts.join(", ")}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Target heat time</dt>
        <dd className="font-medium">{installation.targetHeatTimeMin} min</dd>
      </div>
    </dl>
  );
}
