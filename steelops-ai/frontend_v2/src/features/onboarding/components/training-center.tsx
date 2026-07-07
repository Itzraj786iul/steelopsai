"use client";

import { Award, BookOpen, CheckCircle2 } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { Progress } from "@/components/ui/progress";
import { SectionCard } from "@/components/layout/section-card";
import { TRAINING_PATHS } from "@/features/onboarding/utils/onboarding-data";
import { useOnboardingStore } from "@/stores/onboarding-store";

const audienceLabel = {
  operator: "Operator",
  engineer: "Engineer",
  manager: "Manager",
  executive: "Executive",
};

export function TrainingCenter() {
  const { trainingProgress, trainingBadges, setTrainingProgress, awardBadge, startTour } = useOnboardingStore();

  const startPath = (pathId: string) => {
    setTrainingProgress(pathId, 100);
    awardBadge(pathId);
    if (pathId === "exec-board") startTour();
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Training center" description="Role-based learning paths with progress tracking">
        <div className="grid gap-4 md:grid-cols-2">
          {TRAINING_PATHS.map((path) => {
            const progress = trainingProgress[path.id] ?? 0;
            const complete = progress >= 100;
            return (
              <article key={path.id} className="rounded-xl border border-border/60 p-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">{audienceLabel[path.audience]}</span>
                  {complete ? <CheckCircle2 className="ml-auto h-4 w-4 text-accent" /> : null}
                </div>
                <h3 className="mt-2 text-heading-sm">{path.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{path.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {path.modules} modules · {path.durationMin} min
                </p>
                <Progress value={progress} className="mt-3" />
                <ActionButton className="mt-4" variant={complete ? "outline" : "default"} size="sm" onClick={() => startPath(path.id)}>
                  {complete ? "Replay walkthrough" : "Start walkthrough"}
                </ActionButton>
              </article>
            );
          })}
        </div>
      </SectionCard>

      {trainingBadges.length > 0 ? (
        <SectionCard title="Completion badges" description="Earned certifications">
          <div className="flex flex-wrap gap-3">
            {trainingBadges.map((badge) => {
              const path = TRAINING_PATHS.find((p) => p.id === badge);
              return (
                <div key={badge} className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm">
                  <Award className="h-4 w-4 text-accent" />
                  {path?.title ?? badge}
                </div>
              );
            })}
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
