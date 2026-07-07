"use client";

import { useState } from "react";
import { Play, Route, Sparkles, Wrench } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ActionButton } from "@/components/data-display/action-button";
import { WelcomeExperience } from "@/features/onboarding/components/welcome-experience";
import { InstallationWizard } from "@/features/onboarding/components/installation-wizard";
import { DemoModePlayer } from "@/features/onboarding/components/demo-mode-player";
import { DemoLibrary } from "@/features/onboarding/components/demo-library";
import { CustomerHealthDashboard } from "@/features/onboarding/components/customer-health-dashboard";
import { TrainingCenter } from "@/features/onboarding/components/training-center";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { cn } from "@/lib/utils";

type Tab = "welcome" | "wizard" | "demo" | "library" | "training" | "health";

const TABS: { id: Tab; label: string; icon: typeof Sparkles }[] = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "wizard", label: "Installation", icon: Wrench },
  { id: "demo", label: "Demo mode", icon: Play },
  { id: "library", label: "Demo library", icon: Route },
  { id: "training", label: "Training", icon: Sparkles },
  { id: "health", label: "Health", icon: Wrench },
];

export function OnboardingHub() {
  const { welcomeCompleted, wizardCompleted, startTour } = useOnboardingStore();
  const [tab, setTab] = useState<Tab>(welcomeCompleted ? "demo" : "welcome");

  return (
    <PageContainer size="executive">
      <header className="mb-8">
        <p className="text-label">Customer onboarding</p>
        <h1 className="text-display-md">Deploy SteelOps AI in one hour</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Welcome experience, installation wizard, interactive demos, product tour, and training — everything a pilot plant needs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton variant="outline" size="sm" onClick={() => { startTour(); }}>
            <Route className="h-4 w-4" />
            Replay product tour
          </ActionButton>
        </div>
      </header>

      <nav className="mb-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </nav>

      <div className="space-y-8">
        {tab === "welcome" && (
          <WelcomeExperience onStartTour={() => setTab("demo")} onStartWizard={() => setTab("wizard")} />
        )}
        {tab === "wizard" && (
          <>
            {wizardCompleted ? (
              <p className="rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">Installation wizard complete. Re-run to update configuration.</p>
            ) : null}
            <InstallationWizard />
          </>
        )}
        {tab === "demo" && <DemoModePlayer />}
        {tab === "library" && <DemoLibrary />}
        {tab === "training" && <TrainingCenter />}
        {tab === "health" && <CustomerHealthDashboard />}
      </div>
    </PageContainer>
  );
}
