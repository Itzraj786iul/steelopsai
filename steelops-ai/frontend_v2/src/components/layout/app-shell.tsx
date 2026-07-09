"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header";
import { FooterStatus } from "@/components/layout/footer-status";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { CommandPalette } from "@/features/command-palette/command-palette";
import { CurrentHeatDrawer } from "@/features/eaf/components/current-heat-drawer";
import { HeatToast } from "@/features/eaf/components/heat-toast";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useTrackRecentPage } from "@/hooks/use-track-recent-page";
import { pageTransition, industrialEase } from "@/lib/motion";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useCommandPalette();
  useTrackRecentPage();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <HeaderBar />
        <motion.main
          key={pathname}
          initial={pageTransition.initial}
          animate={pageTransition.animate}
          transition={industrialEase}
          className="flex-1"
        >
          {children}
        </motion.main>
        <FooterStatus />
      </div>
      <CommandPalette />
      <CurrentHeatDrawer />
      <HeatToast />
    </div>
  );
}
