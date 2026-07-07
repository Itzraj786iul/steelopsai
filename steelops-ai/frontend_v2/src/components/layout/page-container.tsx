import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "executive" | "full";
}

export function PageContainer({ children, className, size = "default" }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full space-y-8 px-4 py-8 md:px-8",
        size === "default" && "max-w-page",
        size === "executive" && "max-w-executive",
        size === "full" && "max-w-none",
        className
      )}
    >
      {children}
    </div>
  );
}
