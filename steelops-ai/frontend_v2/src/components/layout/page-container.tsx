import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "executive" | "full";
  /** Tighter rhythm for operator floor pages. */
  density?: "default" | "operator";
  title?: string;
  description?: React.ReactNode;
  /** Small uppercase line above the title (e.g. Step 1 of 4). */
  eyebrow?: React.ReactNode;
  /** Page-level actions (period select, refresh, primary CTA) — right of the title. */
  actions?: React.ReactNode;
  /** Optional meta line under description (e.g. last refresh). */
  meta?: React.ReactNode;
}

export function PageContainer({
  children,
  className,
  size = "default",
  density = "default",
  title,
  description,
  eyebrow,
  actions,
  meta,
}: PageContainerProps) {
  const operator = density === "operator";
  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-full overflow-x-hidden px-3 md:px-8",
        operator
          ? "space-y-4 py-4 sm:space-y-5 sm:px-4 sm:py-5"
          : "space-y-6 py-5 sm:space-y-8 sm:px-4 sm:py-8",
        size === "default" && "max-w-page",
        size === "executive" && "max-w-executive",
        size === "full" && "max-w-none",
        className
      )}
    >
      {title ? (
        <header
          className={cn(
            "flex min-w-0 flex-col sm:flex-row sm:items-start sm:justify-between",
            operator ? "gap-3" : "gap-4"
          )}
        >
          <div className={cn("min-w-0", operator ? "space-y-1" : "space-y-2")}>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
            ) : null}
            <h1
              className={cn(
                "font-semibold tracking-tight",
                operator ? "text-xl sm:text-2xl" : "text-2xl sm:text-display-md"
              )}
            >
              {title}
            </h1>
            {description ? (
              <div
                className={cn(
                  "max-w-2xl text-muted-foreground",
                  operator ? "text-sm leading-snug" : "text-sm leading-relaxed"
                )}
              >
                {description}
              </div>
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
