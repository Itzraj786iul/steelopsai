import { cn } from "@/lib/utils";

export function EnterpriseTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-1 max-w-full overflow-x-auto rounded-lg border border-border/60 sm:mx-0", className)}>
      <table className="enterprise-table w-full min-w-[32rem] text-sm">{children}</table>
    </div>
  );
}

export function EnterpriseTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function EnterpriseTableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function EnterpriseTableRow({
  children,
  interactive,
  onClick,
  className,
}: {
  children: React.ReactNode;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border/40 transition-colors duration-200",
        interactive && "cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50",
        className
      )}
      onClick={onClick}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </tr>
  );
}

export function EnterpriseTableCell({
  children,
  mono,
  className,
}: {
  children: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5 align-middle", mono && "font-mono text-xs", className)}>{children}</td>;
}

export function EnterpriseTableHeaderCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2.5 font-medium", className)}>{children}</th>;
}
