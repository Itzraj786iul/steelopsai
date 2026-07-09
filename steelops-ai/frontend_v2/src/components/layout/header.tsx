"use client";

import Link from "next/link";
import { Command, HelpCircle, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { BreadcrumbBar } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlantContext } from "@/hooks/use-plant-context";
import { PLANTS, SHIFTS } from "@/lib/constants";
import { CurrentHeatPill } from "@/features/eaf/components/current-heat-drawer";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useSidebarStore } from "@/stores/sidebar-store";

export function HeaderBar() {
  const { theme, setTheme } = useTheme();
  const { plantId, shift, setPlantId, setShift } = usePlantContext();
  const { setOpen: setPaletteOpen } = useCommandPaletteStore();
  const { setMobileOpen } = useSidebarStore();

  return (
    <header className="sticky top-0 z-[1200] flex h-header items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <BreadcrumbBar />

      <div className="ml-auto flex items-center gap-2">
        <CurrentHeatPill />
        <NewHeatButton />
        <Select value={plantId} onValueChange={setPlantId}>
          <SelectTrigger className="hidden w-[160px] md:flex">
            <SelectValue placeholder="Plant" />
          </SelectTrigger>
          <SelectContent>
            {PLANTS.map((plant) => (
              <SelectItem key={plant.id} value={plant.id}>
                {plant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={shift} onValueChange={(value) => setShift(value as (typeof SHIFTS)[number])}>
          <SelectTrigger className="hidden w-[100px] sm:flex">
            <SelectValue placeholder="Shift" />
          </SelectTrigger>
          <SelectContent>
            {SHIFTS.map((entry) => (
              <SelectItem key={entry} value={entry}>
                Shift {entry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">
          <Command className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="About">
          <Link href="/eaf/about">
            <HelpCircle className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
