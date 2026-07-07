"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { Sidebar } from "@/components/layout/sidebar";
import { HeaderBar } from "@/components/layout/header";
import { FooterStatus } from "@/components/layout/footer-status";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { CommandPalette } from "@/features/command-palette/command-palette";
import { NotificationPanel } from "@/features/notifications/notification-panel";
import { OfflineBanner } from "@/components/feedback/offline-banner";
import { CelebrationOverlay } from "@/features/mission/components/celebration-overlay";
import { DemoBanner } from "@/features/onboarding/components/demo-banner";
import { ProductTourOverlay } from "@/features/onboarding/components/product-tour-overlay";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { useTrackRecentPage } from "@/hooks/use-track-recent-page";
import { useNotificationsBootstrap } from "@/features/notifications/use-notifications-bootstrap";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { isLiveHeatWorkspacePath } from "@/features/live/utils/live-utils";
import { pageTransition, industrialEase } from "@/lib/motion";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useCommandPalette();
  useTrackRecentPage();
  useNotificationsBootstrap();
  const badges = useNavBadges();
  const pathname = usePathname();
  const immersiveLive = isLiveHeatWorkspacePath(pathname);

  if (immersiveLive) {
    return (
      <div className="min-h-screen bg-background">
        <OfflineBanner />
        <motion.main
          key={pathname}
          initial={pageTransition.initial}
          animate={pageTransition.animate}
          transition={industrialEase}
          className="min-h-screen"
        >
          {children}
        </motion.main>
        <CommandPalette />
        <NotificationPanel />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar badges={badges} />
      <MobileSidebar badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <DemoBanner />
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
      <NotificationPanel />
      <CelebrationOverlay />
      <ProductTourOverlay />
    </div>
  );
}
