"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePermissions } from "@/hooks/use-auth";
import { APP_NAME } from "@/lib/constants";
import {
  PRODUCTION_NAV,
  RESEARCH_NAV,
  ENTERPRISE_NAV,
  TOOLS_NAV,
  ADMIN_NAV,
  OPERATIONS_NAV,
  type NavDefinition,
} from "@/lib/navigation";
import { isNavItemActive } from "@/lib/nav-utils";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";

function MobileNavSection({
  title,
  items,
  pathname,
  searchParams,
  onNavigate,
  canShow,
}: {
  title: string;
  items: NavDefinition[];
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate: () => void;
  canShow: (item: NavDefinition) => boolean;
}) {
  const visible = items.filter(canShow);
  if (!visible.length) return null;

  return (
    <div className="space-y-1">
      <p className="px-3 text-label">{title}</p>
      {visible.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(pathname, searchParams, item.href);
        const children = item.children?.filter(canShow);

        return (
          <div key={`${item.href}-${item.label}`} className="space-y-1">
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
            </Link>
            {children?.length ? (
              <div className="ml-4 space-y-1 border-l border-border/60 pl-2">
                {children.map((child) => {
                  const ChildIcon = child.icon;
                  const childActive = isNavItemActive(pathname, searchParams, child.href);
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-md px-3 text-sm",
                        childActive ? "bg-primary/90 text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <ChildIcon className="h-3.5 w-3.5" />
                      <span>{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mobileOpen, setMobileOpen } = useSidebarStore();
  const { canShowNavItem } = usePermissions();
  const close = () => setMobileOpen(false);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>{APP_NAME}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <div className="space-y-4">
            <MobileNavSection title="Production" items={PRODUCTION_NAV} pathname={pathname} searchParams={searchParams} onNavigate={close} canShow={canShowNavItem} />
            <MobileNavSection title="Operations" items={OPERATIONS_NAV} pathname={pathname} searchParams={searchParams} onNavigate={close} canShow={canShowNavItem} />
            <MobileNavSection title="Administration" items={ADMIN_NAV} pathname={pathname} searchParams={searchParams} onNavigate={close} canShow={canShowNavItem} />
            <MobileNavSection title="Enterprise" items={ENTERPRISE_NAV} pathname={pathname} searchParams={searchParams} onNavigate={close} canShow={canShowNavItem} />
            <MobileNavSection title="Research" items={RESEARCH_NAV} pathname={pathname} searchParams={searchParams} onNavigate={close} canShow={canShowNavItem} />
            <MobileNavSection title="Tools" items={TOOLS_NAV} pathname={pathname} searchParams={searchParams} onNavigate={close} canShow={canShowNavItem} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
