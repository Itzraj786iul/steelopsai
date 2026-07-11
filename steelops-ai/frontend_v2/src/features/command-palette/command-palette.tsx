"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/use-auth";
import { useDebounce } from "@/hooks/use-debounce";
import {
  buildNavigationItems,
  buildQuickActionItems,
  filterCommandItems,
} from "@/services/search-index";
import { useCommandPaletteStore } from "@/stores/command-palette-store";

const GROUP_LABELS = {
  navigation: "Navigation",
  action: "Quick Actions",
};

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const { open, setOpen, query, setQuery, addRecent } = useCommandPaletteStore();
  const debouncedQuery = useDebounce(query, 250);

  const baseItems = useMemo(() => {
    const role = user?.role ?? "operator";
    return [...buildQuickActionItems(role), ...buildNavigationItems(role)];
  }, [user?.role]);

  const items = filterCommandItems(baseItems, debouncedQuery);

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.group] ??= [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const handleSelect = (itemId: string) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    addRecent(item.label);
    setOpen(false);
    setQuery("");
    if (item.href) router.push(item.href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages and actions..." value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(grouped).map(([group, groupItems]) => (
          <CommandGroup key={group} heading={GROUP_LABELS[group as keyof typeof GROUP_LABELS] ?? group}>
            {groupItems.map((item) => (
              <CommandItem key={item.id} value={item.id} onSelect={handleSelect}>
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
