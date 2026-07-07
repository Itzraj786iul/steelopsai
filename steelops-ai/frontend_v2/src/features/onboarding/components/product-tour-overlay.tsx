"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { PRODUCT_TOUR_STEPS } from "@/features/onboarding/utils/onboarding-data";
import { useOnboardingStore } from "@/stores/onboarding-store";

export function ProductTourOverlay() {
  const router = useRouter();
  const { tourActive, tourStep, setTourStep, stopTour, completeTour } = useOnboardingStore();
  const step = PRODUCT_TOUR_STEPS[tourStep];
  const isLast = tourStep >= PRODUCT_TOUR_STEPS.length - 1;

  useEffect(() => {
    if (!tourActive || !step?.href) return;
    router.push(step.href);
  }, [tourActive, tourStep, step?.href, router]);

  if (!tourActive || !step) return null;

  const finish = () => {
    completeTour();
    stopTour();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-elevation-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-label">
              Product tour · {tourStep + 1} of {PRODUCT_TOUR_STEPS.length}
            </p>
            <h3 className="mt-1 text-heading-md">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </div>
          <ActionButton variant="ghost" size="icon" onClick={finish} aria-label="Close tour">
            <X className="h-4 w-4" />
          </ActionButton>
        </div>
        <div className="mt-6 flex justify-between">
          <ActionButton
            variant="outline"
            onClick={() => setTourStep(Math.max(0, tourStep - 1))}
            disabled={tourStep === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </ActionButton>
          {isLast ? (
            <ActionButton onClick={finish}>Finish tour</ActionButton>
          ) : (
            <ActionButton onClick={() => setTourStep(tourStep + 1)}>
              Next
              <ChevronRight className="h-4 w-4" />
            </ActionButton>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Replay anytime from Onboarding → Product tour
        </p>
      </div>
    </div>
  );
}
