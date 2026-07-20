import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "executive" | "full";
  title?: string;
  description?: React.ReactNode;
  /** Page-level actions (period select, refresh, primary CTA) — right of the title. */
  actions?: React.ReactNode;
  /** Optional meta line under description (e.g. last refresh). */
  meta?: React.ReactNode;
}

export function PageContainer({
  children,
  className,
  size = "default",
  title,
  description,
  actions,
  meta,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-full space-y-6 overflow-x-hidden px-3 py-5 sm:space-y-8 sm:px-4 sm:py-8 md:px-8",
        size === "default" && "max-w-page",
        size === "executive" && "max-w-executive",
        size === "full" && "max-w-none",
        className
      )}
    >
      {title ? (
        <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-display-md">{title}</h1>
            {description ? (
              <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div>
            ) : null}
            {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
          </div>
          {actions ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
