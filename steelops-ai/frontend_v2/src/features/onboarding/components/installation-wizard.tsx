"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INTEGRATIONS, WIZARD_STEPS } from "@/features/onboarding/utils/onboarding-data";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { usePlantStore } from "@/stores/plant-store";
import { SHIFTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const GOAL_OPTIONS = ["Reduce heat time", "Increase GREEN %", "Lower power cost", "Improve yield", "Reduce CO₂"];

export function InstallationWizard() {
  const { wizardStep, setWizardStep, installation, updateInstallation, completeWizard } = useOnboardingStore();
  const setPlantId = usePlantStore((s) => s.setPlantId);
  const [localMaterials, setLocalMaterials] = useState(installation.materials.join(", "));

  const step = WIZARD_STEPS[wizardStep];
  const isLast = wizardStep === WIZARD_STEPS.length - 1;

  const next = () => {
    if (isLast) {
      setPlantId("jspl-angul");
      completeWizard();
      return;
    }
    setWizardStep(wizardStep + 1);
  };

  const back = () => setWizardStep(Math.max(0, wizardStep - 1));

  const toggleShift = (shift: (typeof SHIFTS)[number]) => {
    const shifts = installation.shifts.includes(shift)
      ? installation.shifts.filter((s) => s !== shift)
      : [...installation.shifts, shift];
    updateInstallation({ shifts });
  };

  const toggleGoal = (goal: string) => {
    const goals = installation.businessGoals.includes(goal)
      ? installation.businessGoals.filter((g) => g !== goal)
      : [...installation.businessGoals, goal];
    updateInstallation({ businessGoals: goals });
  };

  const toggleIntegration = (id: string) => {
    const integrations = installation.integrations.includes(id)
      ? installation.integrations.filter((i) => i !== id)
      : [...installation.integrations, id];
    updateInstallation({ integrations });
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {WIZARD_STEPS.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium",
              i < wizardStep && "bg-accent text-accent-foreground",
              i === wizardStep && "bg-primary text-primary-foreground",
              i > wizardStep && "bg-muted text-muted-foreground"
            )}
            title={s.title}
          >
            {i < wizardStep ? <Check className="h-4 w-4" /> : i + 1}
          </div>
        ))}
      </div>

      <h2 className="text-heading-lg">{step.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Step {wizardStep + 1} of {WIZARD_STEPS.length}</p>

      <div className="mt-6 min-h-[200px] space-y-4">
        {step.id === "plant" && (
          <div className="space-y-2">
            <Label htmlFor="plantName">Plant name</Label>
            <Input
              id="plantName"
              value={installation.plantName}
              onChange={(e) => updateInstallation({ plantName: e.target.value })}
            />
          </div>
        )}
        {step.id === "furnaces" && (
          <div className="space-y-2">
            <Label htmlFor="furnaces">Number of EAF furnaces</Label>
            <Input
              id="furnaces"
              type="number"
              min={1}
              max={6}
              value={installation.furnaces}
              onChange={(e) => updateInstallation({ furnaces: Number(e.target.value) })}
            />
          </div>
        )}
        {step.id === "shifts" && (
          <div className="flex flex-wrap gap-2">
            {SHIFTS.map((shift) => (
              <ActionButton
                key={shift}
                variant={installation.shifts.includes(shift) ? "default" : "outline"}
                onClick={() => toggleShift(shift)}
              >
                Shift {shift}
              </ActionButton>
            ))}
          </div>
        )}
        {step.id === "materials" && (
          <div className="space-y-2">
            <Label htmlFor="materials">Material names (comma-separated)</Label>
            <Input
              id="materials"
              value={localMaterials}
              onChange={(e) => {
                setLocalMaterials(e.target.value);
                updateInstallation({ materials: e.target.value.split(",").map((m) => m.trim()).filter(Boolean) });
              }}
            />
          </div>
        )}
        {step.id === "targets" && (
          <div className="space-y-2">
            <Label htmlFor="target">Target heat time (minutes)</Label>
            <Input
              id="target"
              type="number"
              value={installation.targetHeatTimeMin}
              onChange={(e) => updateInstallation({ targetHeatTimeMin: Number(e.target.value) })}
            />
          </div>
        )}
        {step.id === "goals" && (
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <ActionButton
                key={goal}
                variant={installation.businessGoals.includes(goal) ? "default" : "outline"}
                onClick={() => toggleGoal(goal)}
              >
                {goal}
              </ActionButton>
            ))}
          </div>
        )}
        {step.id === "integrations" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {INTEGRATIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleIntegration(item.id)}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm transition-colors",
                  installation.integrations.includes(item.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                )}
              >
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </button>
            ))}
          </div>
        )}
        {step.id === "finish" && (
          <div className="space-y-3 rounded-xl bg-muted/50 p-4 text-sm">
            <p><strong>{installation.plantName}</strong> · {installation.furnaces} furnaces · Shifts {installation.shifts.join(", ")}</p>
            <p>Target heat time: {installation.targetHeatTimeMin} min</p>
            <p>Goals: {installation.businessGoals.join(", ") || "None selected"}</p>
            <p>Integrations: {installation.integrations.length || "Default stack"}</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between">
        <ActionButton variant="outline" onClick={back} disabled={wizardStep === 0}>
          <ChevronLeft className="h-4 w-4" />
          Back
        </ActionButton>
        <ActionButton onClick={next}>
          {isLast ? "Finish setup" : "Continue"}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </ActionButton>
      </div>
    </section>
  );
}
