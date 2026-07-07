"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Sparkles, Trophy } from "lucide-react";

import { useCelebrationStore, type CelebrationKind } from "@/stores/celebration-store";

const ICONS: Record<CelebrationKind, typeof Trophy> = {
  target_achieved: Trophy,
  approval_success: CheckCircle2,
  heat_completed: CheckCircle2,
  recommendation_accepted: Sparkles,
  learning_unlocked: Sparkles,
};

export function CelebrationOverlay() {
  const { active, message, clear } = useCelebrationStore();

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(clear, 2800);
    return () => clearTimeout(t);
  }, [active, clear]);

  const Icon = active ? ICONS[active] : Trophy;

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[2000] flex items-center justify-center bg-background/60 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-accent/40 bg-card px-10 py-8 shadow-glow-ai"
          >
            <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 0.5 }}>
              <Icon className="h-12 w-12 text-accent" />
            </motion.div>
            <p className="text-lg font-semibold">{message}</p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
