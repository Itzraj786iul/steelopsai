"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Circle, Play, SkipForward, Sparkles } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Badge } from "@/components/ui/badge";
import { ONBOARDING_STATUS_ITEMS } from "@/features/onboarding/utils/onboarding-data";
import { useOnboardingStore } from "@/stores/onboarding-store";

interface WelcomeExperienceProps {
  onStartTour: () => void;
  onStartWizard: () => void;
}

export function WelcomeExperience({ onStartTour, onStartWizard }: WelcomeExperienceProps) {
  const { wizardCompleted, completeWelcome, skipWelcome, startTour } = useOnboardingStore();

  const statusItems = [
    { ...ONBOARDING_STATUS_ITEMS[0], done: wizardCompleted, detail: wizardCompleted ? "Configured" : "Pending wizard" },
    { ...ONBOARDING_STATUS_ITEMS[1], done: true, detail: "Enterprise Pilot · 3 furnaces" },
    { ...ONBOARDING_STATUS_ITEMS[2], done: true, detail: "MES, SCADA, Historian live" },
    { ...ONBOARDING_STATUS_ITEMS[3], done: true, detail: "Foundation model ready" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12"
    >
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative space-y-8">
        <div className="space-y-3">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            First run
          </Badge>
          <h1 className="text-display-md">Welcome to SteelOps AI</h1>
          <p className="max-w-2xl text-muted-foreground">
            Your enterprise operating system for EAF steel production. Understand value within one hour — install, connect, and run a full AI workflow demo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statusItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-border/60 bg-background/60 p-4">
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">{item.label}</p>
                {item.done ? (
                  <CheckCircle2 className="ml-auto h-4 w-4 text-accent" />
                ) : (
                  <Circle className="ml-auto h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <ActionButton
            onClick={() => {
              completeWelcome();
              onStartWizard();
            }}
          >
            Complete setup
            <ArrowRight className="h-4 w-4" />
          </ActionButton>
          <ActionButton
            variant="outline"
            onClick={() => {
              completeWelcome();
              startTour();
              onStartTour();
            }}
          >
            <Play className="h-4 w-4" />
            Quick tour
          </ActionButton>
          <ActionButton variant="ghost" onClick={skipWelcome}>
            <SkipForward className="h-4 w-4" />
            Skip for now
          </ActionButton>
          <ActionButton variant="ghost" asChild>
            <Link href="/help">Help center</Link>
          </ActionButton>
        </div>
      </div>
    </motion.section>
  );
}
