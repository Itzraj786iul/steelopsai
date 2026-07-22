"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header";
import { FooterStatus } from "@/components/layout/footer-status";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { CommandPalette } from "@/features/command-palette/command-palette";
import { HeatToast } from "@/features/eaf/components/heat-toast";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useTrackRecentPage } from "@/hooks/use-track-recent-page";
import { useTrackPagePerformance } from "@/hooks/use-track-page-performance";

interface AppShellProps {
  children: React.ReactNode;
}

/** Instant route paint — no enter fade that makes every click feel laggy. */
export function AppShell({ children }: AppShellProps) {
  useCommandPalette();
  useTrackRecentPage();
  useTrackPagePerformance();
  usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>
      <Suspense fallback={null}>
        <MobileSidebar />
      </Suspense>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <OfflineBanner />
        <HeaderBar />
        <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</main>
        <FooterStatus />
      </div>
      <CommandPalette />
      <HeatToast />
    </div>
  );
}
