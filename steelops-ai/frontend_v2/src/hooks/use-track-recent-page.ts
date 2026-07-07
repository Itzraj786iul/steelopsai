"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { useNavRecentStore } from "@/stores/nav-recent-store";

export function useTrackRecentPage() {
  const pathname = usePathname();
  const addRecent = useNavRecentStore((s) => s.addRecent);

  useEffect(() => {
    addRecent(pathname);
  }, [pathname, addRecent]);
}
