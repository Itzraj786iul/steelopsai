"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Command, HelpCircle, LogOut, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { BreadcrumbBar } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewHeatButton } from "@/features/eaf/components/new-heat-button";
import { useAuth } from "@/hooks/use-auth";
import { usePlantContext } from "@/hooks/use-plant-context";
import { authApi } from "@/lib/api/auth";
import { PLANTS, SHIFTS } from "@/lib/constants";
import { getRefreshToken } from "@/services/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useSidebarStore } from "@/stores/sidebar-store";

export function HeaderBar() {
  const { theme, setTheme } = useTheme();
  const { plantId, shift, setPlantId, setShift } = usePlantContext();
  const { setOpen: setPaletteOpen } = useCommandPaletteStore();
  const { setMobileOpen } = useSidebarStore();
  const { user } = useAuth();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  const logout = async () => {
    const refresh = getRefreshToken();
    await authApi.logout(refresh ?? undefined);
    clearAuth();
    router.replace("/login");
  };

  return (
    <header className="z-[1200] flex h-header shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background/90 px-3 backdrop-blur sm:gap-3 md:px-6">
      <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <BreadcrumbBar />

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
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

        {user ? (
          <div className="hidden max-w-[140px] truncate text-xs text-muted-foreground lg:block" title={user.email}>
            {user.full_name}
            <span className="block text-[10px] uppercase tracking-wide">{user.role}</span>
          </div>
        ) : null}

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

        <Button variant="ghost" size="icon" onClick={() => void logout()} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
