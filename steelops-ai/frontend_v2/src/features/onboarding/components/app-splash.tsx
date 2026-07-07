"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";

import { APP_NAME } from "@/lib/constants";

interface AppSplashProps {
  minDurationMs?: number;
}

export function AppSplash({ minDurationMs = 1200 }: AppSplashProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), minDurationMs);
    return () => window.clearTimeout(timer);
  }, [minDurationMs]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[3000] flex flex-col items-center justify-center bg-background"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-elevation-md">
              <Flame className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-display-sm">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">Enterprise AI for EAF steel production</p>
            <div className="mt-4 h-1 w-32 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: minDurationMs / 1000, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
