import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export function LoadingSkeleton({ rows = 4, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full shimmer" />
      ))}
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-fade-in" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56 shimmer" />
        <Skeleton className="h-4 w-80 shimmer" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg shimmer" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-lg shimmer" />
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-48 flex-col justify-end gap-2 rounded-xl border border-border/60 p-4", className)}
      role="status"
      aria-label="Loading chart"
    >
      <div className="flex h-full items-end gap-2">
        {[40, 65, 50, 80, 55, 70].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md shimmer" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function PredictionShimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-2xl border border-prediction/20 p-6 prediction-shimmer", className)}
      role="status"
      aria-label="Running prediction"
    >
      <Skeleton className="mb-4 h-4 w-40 bg-prediction/20" />
      <Skeleton className="mb-2 h-8 w-64 bg-prediction/20" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-prediction/15" />
        ))}
      </div>
    </div>
  );
}

export function TwinLoadingSkeleton() {
  return (
    <div className="glass-panel space-y-4 rounded-xl p-4" role="status" aria-label="Loading digital twin">
      <Skeleton className="h-32 w-full rounded-lg shimmer" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-14 shimmer" />
        <Skeleton className="h-14 shimmer" />
      </div>
      <ChartSkeleton />
    </div>
  );
}

export function RecommendationSkeleton() {
  return <PredictionShimmer className="min-h-[220px]" />;
}
