import { flattenNavItems, ALL_NAV_ITEMS, QUICK_ACTIONS } from "@/lib/navigation";
import { isNavItemVisible } from "@/lib/rbac/permissions";
import type { CommandPaletteItem } from "@/types";

export function buildNavigationItems(role: string): CommandPaletteItem[] {
  return flattenNavItems(ALL_NAV_ITEMS)
    .filter((item) => isNavItemVisible(role, item))
    .map((item) => ({
      id: `nav-${item.href}-${item.label}`,
      label: item.label,
      href: item.href,
      group: "navigation" as const,
      keywords: [item.label.toLowerCase(), item.href.replace(/\//g, " ")],
    }));
}

export function buildQuickActionItems(role: string): CommandPaletteItem[] {
  return QUICK_ACTIONS.filter((action) => isNavItemVisible(role, action)).map((action) => ({
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
