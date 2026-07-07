"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import { ALL_NAV_ITEMS } from "@/lib/navigation";

function titleCase(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const navMatch = ALL_NAV_ITEMS.find((item) => item.href === href);
    const label = navMatch?.label ?? (/^\d+$/.test(segment) || segment.length > 12 ? `#${segment.slice(0, 8)}` : titleCase(segment));
    return { href, label };
  });

  if (!crumbs.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Home className="h-4 w-4" />
        <span>Home</span>
      </div>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 overflow-hidden text-sm">
      <Link href="/dashboard" className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.slice(0, 4).map((crumb, index) => (
        <div key={crumb.href} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          {index === crumbs.length - 1 || index === 3 ? (
            <span className="truncate font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

export function BreadcrumbBar({ className }: { className?: string }) {
  return (
    <div className={cn("min-w-0 flex-1", className)}>
      <Breadcrumbs />
    </div>
  );
}
