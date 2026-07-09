"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { APP_NAME } from "@/lib/constants";
import { PRIMARY_NAV, type NavDefinition } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";

function MobileNavSection({
  items,
  pathname,
  onNavigate,
}: {
  items: NavDefinition[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const children = item.children;

        return (
          <div key={item.href} className="space-y-1">
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
                  const childActive = pathname === child.href;
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
  const { mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>{APP_NAME}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-4rem)] px-3 py-4">
          <MobileNavSection items={PRIMARY_NAV} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
