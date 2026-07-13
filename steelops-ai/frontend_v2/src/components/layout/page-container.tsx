import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "executive" | "full";
  title?: string;
  description?: string;
}

export function PageContainer({
  children,
  className,
  size = "default",
  title,
  description,
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
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-display-md">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
