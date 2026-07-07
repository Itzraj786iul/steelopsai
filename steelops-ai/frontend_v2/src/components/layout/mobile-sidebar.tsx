"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/use-auth";
import {
  INSIGHTS_NAV,
  PRIMARY_NAV,
  SECONDARY_NAV,
  PLATFORM_NAV,
  type NavDefinition,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";

interface MobileSidebarProps {
  badges?: Partial<Record<NonNullable<NavDefinition["badgeKey"]>, number>>;
}

function MobileNavSection({
  title,
  items,
  pathname,
  badges,
  canAccess,
  onNavigate,
}: {
  title?: string;
  items: NavDefinition[];
  pathname: string;
  badges?: MobileSidebarProps["badges"];
  canAccess: (href: string) => boolean;
  onNavigate: () => void;
}) {
  const visibleItems = items.filter((item) => canAccess(item.href));
  if (!visibleItems.length) return null;

  return (
    <div className="space-y-1">
      {title ? <p className="px-3 py-2 text-label">{title}</p> : null}
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
            {badge && badge > 0 ? <Badge variant="outline">{badge}</Badge> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function MobileSidebar({ badges }: MobileSidebarProps) {
  const pathname = usePathname();
  const { mobileOpen, setMobileOpen } = useSidebarStore();
  const { canAccessRoute } = usePermissions();

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>SteelOps AI</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <div className="space-y-4">
            <MobileNavSection items={PRIMARY_NAV} pathname={pathname} badges={badges} canAccess={canAccessRoute} onNavigate={() => setMobileOpen(false)} />
            <Separator />
            <MobileNavSection title="Insights" items={INSIGHTS_NAV} pathname={pathname} canAccess={canAccessRoute} onNavigate={() => setMobileOpen(false)} />
            <Separator />
            <MobileNavSection items={SECONDARY_NAV} pathname={pathname} canAccess={canAccessRoute} onNavigate={() => setMobileOpen(false)} />
            <Separator />
            <MobileNavSection items={PLATFORM_NAV} pathname={pathname} canAccess={canAccessRoute} onNavigate={() => setMobileOpen(false)} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
