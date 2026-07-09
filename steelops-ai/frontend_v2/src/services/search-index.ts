import { flattenNavItems, ALL_NAV_ITEMS, QUICK_ACTIONS } from "@/lib/navigation";
import { canAccessRoute } from "@/lib/rbac/permissions";
import type { CommandPaletteItem } from "@/types";

export function buildNavigationItems(role: string): CommandPaletteItem[] {
  return flattenNavItems(ALL_NAV_ITEMS)
    .filter((item) => {
      if (!item.roles || item.roles.length === 0) return canAccessRoute(role, item.href);
      return item.roles.some((allowedRole) => canAccessRoute(allowedRole, item.href));
    })
    .map((item) => ({
      id: `nav-${item.href}`,
      label: item.label,
      href: item.href,
      group: "navigation" as const,
      keywords: [item.label.toLowerCase(), item.href.replace(/\//g, " ")],
    }));
}

export function buildQuickActionItems(): CommandPaletteItem[] {
  return QUICK_ACTIONS.map((action) => ({
    id: action.id,
    label: action.label,
    href: action.href,
    group: "action" as const,
    keywords: [action.label.toLowerCase(), action.shortcut?.toLowerCase() ?? ""],
  }));
}

export function filterCommandItems(items: CommandPaletteItem[], query: string): CommandPaletteItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items.slice(0, 12);

  return items
    .filter((item) => {
      const haystack = [item.label, ...(item.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(normalized);
    })
    .slice(0, 20);
}
