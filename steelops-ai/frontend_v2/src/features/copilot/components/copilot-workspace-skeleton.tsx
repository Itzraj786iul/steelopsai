"use client";

import { Sparkles, Target } from "lucide-react";

import {
  ChartSkeleton,
  PredictionShimmer,
  TwinLoadingSkeleton,
} from "@/components/feedback/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer } from "@/components/layout/page-container";

interface CopilotWorkspaceSkeletonProps {
  heatNumber?: string | null;
  phase?: "loading" | "analyzing";
}

export function CopilotWorkspaceSkeleton({ heatNumber, phase = "loading" }: CopilotWorkspaceSkeletonProps) {
  const analyzing = phase === "analyzing";

  return (
    <PageContainer size="full" className="space-y-6 pb-32">
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6 shadow-glow-ai md:p-8">
        <div className="absolute right-6 top-6 opacity-10">
          <Sparkles className="h-20 w-20 text-primary" />
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <Skeleton className="h-5 w-36 shimmer" />
            </div>
            <p className="text-label">Mission workspace</p>
            <h1 className="text-display-sm md:text-display-md">
              {heatNumber ?? <Skeleton className="inline-block h-9 w-48 shimmer" />}
            </h1>
            <p className="text-sm text-muted-foreground">
              {analyzing ? "Running SIFM pre-heat intelligence…" : "Loading shift schedule and heat data…"}
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl shimmer" />
          ))}
        </div>
      </div>

      <Skeleton className="h-14 w-full rounded-xl shimmer" />

      <div className="grid gap-6 xl:grid-cols-12">
        <aside className="xl:col-span-3">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-elevation-sm">
            <Skeleton className="mb-4 h-5 w-32 shimmer" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-md shimmer" />
              ))}
            </div>
          </div>
        </aside>
        <main className="xl:col-span-5">
          <PredictionShimmer />
        </main>
        <aside className="xl:col-span-4">
          <TwinLoadingSkeleton />
        </aside>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-elevation-sm">
        <Skeleton className="mb-4 h-6 w-40 shimmer" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-lg shimmer" />
          ))}
        </div>
        <div className="mt-6">
          <ChartSkeleton className="h-56" />
        </div>
      </div>
    </PageContainer>
  );
}
