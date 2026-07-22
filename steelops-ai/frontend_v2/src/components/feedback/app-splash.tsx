"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

interface AppSplashProps {
  /** Soft brand flash only — keep tiny so login/post-auth never feels stuck. */
  minDurationMs?: number;
}

const SKIP_KEY = "steelops_skip_splash";

export function AppSplash({ minDurationMs = 0 }: AppSplashProps) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    // Skip after login redirect / when already authenticated this session.
    if (sessionStorage.getItem(SKIP_KEY) === "1") return false;
    try {
      if (document.cookie.includes("steelops_authenticated=1")) return false;
    } catch {
      /* ignore */
    }
    return true;
  });

  useEffect(() => {
    if (!visible) return;
    if (minDurationMs <= 0) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(false), minDurationMs);
    return () => window.clearTimeout(timer);
  }, [minDurationMs, visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-elevation-md">
              <Flame className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-display-sm">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">Electric Arc Furnace AI Decision Support</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Call right before post-login navigation so the splash does not reappear. */
export function skipAppSplashOnce() {
  try {
    sessionStorage.setItem(SKIP_KEY, "1");
  } catch {
    /* ignore */
  }
}
