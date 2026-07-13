"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header";
import { FooterStatus } from "@/components/layout/footer-status";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { CommandPalette } from "@/features/command-palette/command-palette";
import {
  EafContentPadding,
  StickyCurrentHeatMobileBar,
  StickyCurrentHeatPanelDesktop,
} from "@/features/eaf/components/sticky-current-heat-panel";
import { HeatToast } from "@/features/eaf/components/heat-toast";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useTrackRecentPage } from "@/hooks/use-track-recent-page";
import { useTrackPagePerformance } from "@/hooks/use-track-page-performance";
import { pageTransition, industrialEase } from "@/lib/motion";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useCommandPalette();
  useTrackRecentPage();
  useTrackPagePerformance();
  const pathname = usePathname();
  const isEaf = pathname.startsWith("/eaf");

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
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <motion.main
            key={pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            transition={industrialEase}
            className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            {children}
            {isEaf ? <EafContentPadding /> : null}
          </motion.main>
          {isEaf ? <StickyCurrentHeatPanelDesktop /> : null}
        </div>
        <FooterStatus />
      </div>
      {isEaf ? <StickyCurrentHeatMobileBar /> : null}
      <CommandPalette />
      <HeatToast />
    </div>
  );
}
