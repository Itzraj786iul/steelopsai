"use client";

import Link from "next/link";
import { Bell, Command, HelpCircle, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BreadcrumbBar } from "@/components/layout/breadcrumbs";
import { DecisionModeSwitcher } from "@/features/mission/components/decision-mode-switcher";
import { useAuth } from "@/hooks/use-auth";
import { usePlantContext } from "@/hooks/use-plant-context";
import { PLANTS, SHIFTS } from "@/lib/constants";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useSidebarStore } from "@/stores/sidebar-store";

export function HeaderBar() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { plantId, shift, setPlantId, setShift } = usePlantContext();
  const { setOpen: setPaletteOpen } = useCommandPaletteStore();
  const { setPanelOpen, unreadCount } = useNotificationStore();
  const { setMobileOpen } = useSidebarStore();

  const initials = user?.full_name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-[1200] flex h-header items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <BreadcrumbBar />

      <div className="ml-auto flex items-center gap-2">
        <DecisionModeSwitcher />
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

        <Button variant="ghost" size="icon" className="relative" onClick={() => setPanelOpen(true)} aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount() > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1">{unreadCount()}</Badge>
          ) : null}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" asChild aria-label="Help">
          <Link href="/help">
            <HelpCircle className="h-4 w-4" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials ?? "SO"}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm md:inline">{user?.full_name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="space-y-1">
                <p>{user?.full_name}</p>
                <p className="text-xs font-normal capitalize text-muted-foreground">{user?.role?.replace(/_/g, " ")}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
