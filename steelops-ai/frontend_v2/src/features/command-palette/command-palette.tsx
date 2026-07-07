"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
import { heatsApi } from "@/lib/api/heats";
import {
  buildHeatItems,
  buildNavigationItems,
  buildQuickActionItems,
  filterCommandItems,
} from "@/services/search-index";
import { useCommandPaletteStore } from "@/stores/command-palette-store";

const GROUP_LABELS = {
  navigation: "Navigation",
  action: "Quick Actions",
  heat: "Heats",
  operator: "Operators",
  settings: "Settings",
};

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuth();
  const { open, setOpen, query, setQuery, addRecent } = useCommandPaletteStore();
  const debouncedQuery = useDebounce(query, 250);
  const [heatResults, setHeatResults] = useState<ReturnType<typeof buildHeatItems>>([]);

  const baseItems = useMemo(() => {
    const role = user?.role ?? "operator";
    return [...buildQuickActionItems(), ...buildNavigationItems(role)];
  }, [user?.role]);

  useEffect(() => {
    let cancelled = false;

    async function searchHeats() {
      if (debouncedQuery.trim().length < 2) {
        setHeatResults([]);
        return;
      }

      try {
        const response = await heatsApi.list(1, 10);
        const filtered = response.data.items.filter((heat) => {
          const haystack = `${heat.heat_number} ${heat.shift ?? ""} ${heat.status}`.toLowerCase();
          return haystack.includes(debouncedQuery.toLowerCase());
        });
        if (!cancelled) {
          setHeatResults(buildHeatItems(filtered));
        }
      } catch {
        if (!cancelled) setHeatResults([]);
      }
    }

    searchHeats();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const items = filterCommandItems([...baseItems, ...heatResults], debouncedQuery);

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
      <CommandInput placeholder="Search routes, heats, actions..." value={query} onValueChange={setQuery} />
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
