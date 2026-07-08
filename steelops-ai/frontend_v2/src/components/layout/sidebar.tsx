"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pin, Search, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePermissions } from "@/hooks/use-auth";
import { usePlantContext } from "@/hooks/use-plant-context";
import { APP_NAME } from "@/lib/constants";
import {
  ALL_NAV_ITEMS,
  PRIMARY_NAV,
  type NavDefinition,
} from "@/lib/navigation";
import { industrialEase } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useNavRecentStore } from "@/stores/nav-recent-store";
import { useSidebarStore } from "@/stores/sidebar-store";

interface SidebarProps {
  badges?: Partial<Record<NonNullable<NavDefinition["badgeKey"]>, number>>;
}

function resolveNavLabel(href: string) {
  return ALL_NAV_ITEMS.find((item) => item.href === href)?.label ?? href.replace(/^\//, "");
}

function NavLink({
  item,
  collapsed,
  active,
  badge,
}: {
  item: NavDefinition;
  collapsed: boolean;
  active: boolean;
  badge?: number;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-ring",
        active
          ? "bg-primary text-primary-foreground shadow-glow-primary"
          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {badge && badge > 0 ? (
            <Badge variant={active ? "secondary" : "outline"} className="h-5 min-w-5 justify-center px-1.5">
              {badge}
            </Badge>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}

function NavSection({
  title,
  items,
  collapsed,
  pathname,
  badges,
  canAccess,
}: {
  title?: string;
  items: NavDefinition[];
  collapsed: boolean;
  pathname: string;
  badges?: SidebarProps["badges"];
  canAccess: (href: string) => boolean;
}) {
  const visibleItems = items.filter((item) => canAccess(item.href));

  if (!visibleItems.length) return null;

  return (
    <div className="space-y-1">
      {title && !collapsed ? <p className="px-3 py-2 text-label">{title}</p> : null}
      {visibleItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          badge={item.badgeKey ? badges?.[item.badgeKey] : undefined}
        />
      ))}
    </div>
  );
}

export function Sidebar({ badges }: SidebarProps) {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarStore();
  const { setOpen } = useCommandPaletteStore();
  const { recent, pinned } = useNavRecentStore();
  const { canAccessRoute } = usePermissions();
  const { plant } = usePlantContext();

  const pinnedItems = pinned
    .map((href) => ALL_NAV_ITEMS.find((item) => item.href === href))
    .filter((item): item is NavDefinition => Boolean(item && canAccessRoute(item.href)));

  const recentItems = recent
    .filter((href) => !pinned.includes(href) && canAccessRoute(href))
    .slice(0, 4)
    .map((href) => ({ href, label: resolveNavLabel(href) }));

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 260 }}
      transition={industrialEase}
      className="hidden h-screen shrink-0 flex-col border-r border-border glass-panel-strong lg:flex"
    >
      <div className="flex h-header items-center justify-between border-b border-border/60 px-3">
        {!collapsed ? (
          <div className="min-w-0 px-2">
            <p className="truncate text-sm font-bold tracking-tight">{APP_NAME}</p>
            <p className="truncate text-xs text-muted-foreground">
              {plant.name} · {plant.line}
            </p>
          </div>
        ) : null}
        <Button variant="ghost" size="icon" onClick={toggleCollapsed} aria-label="Toggle sidebar" className="focus-ring">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed ? (
        <div className="p-3">
          <Button variant="outline" className="w-full justify-start gap-2 focus-ring" onClick={() => setOpen(true)}>
            <Search className="h-4 w-4" />
            Search
            <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
          </Button>
        </div>
      ) : null}

      <ScrollArea className="flex-1 px-3 pb-3">
        <div className="space-y-4">
          <NavSection items={PRIMARY_NAV} collapsed={collapsed} pathname={pathname} badges={badges} canAccess={() => true} />

          {!collapsed && pinnedItems.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 px-3 py-2 text-label">
                  <Pin className="h-3 w-3" /> Pinned
                </p>
                {pinnedItems.map((item) => (
                  <NavLink
                    key={`pin-${item.href}`}
                    item={item}
                    collapsed={collapsed}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  />
                ))}
              </div>
            </>
          ) : null}

          {!collapsed && recentItems.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="flex items-center gap-1.5 px-3 py-2 text-label">
                  <Star className="h-3 w-3" /> Recent
                </p>
                {recentItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground focus-ring",
                      pathname === item.href && "bg-muted text-foreground"
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </ScrollArea>
    </motion.aside>
  );
}
