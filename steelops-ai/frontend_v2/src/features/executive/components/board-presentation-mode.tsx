"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, Minimize2, Play, Pause } from "lucide-react";
import { ActionButton } from "@/components/data-display/action-button";

interface BoardPresentationModeProps {
  children: React.ReactNode;
}

export function BoardPresentationMode({ children }: BoardPresentationModeProps) {
  const [active, setActive] = useState(false);
  const [autoScroll, setAutoScroll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setActive(true);
    } else {
      await document.exitFullscreen();
      setActive(false);
    }
  }, []);

  useEffect(() => {
    const onChange = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!autoScroll || !active) return;
    const el = containerRef.current;
    if (!el) return;
    const id = setInterval(() => {
      el.scrollBy({ top: 2, behavior: "smooth" });
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) el.scrollTop = 0;
    }, 50);
    return () => clearInterval(id);
  }, [autoScroll, active]);

  return (
    <div ref={containerRef} className={active ? "h-screen overflow-y-auto bg-background p-8" : undefined}>
      <div className="mb-6 flex flex-wrap gap-2 print:hidden">
        <ActionButton variant={active ? "default" : "outline"} onClick={toggleFullscreen}>
          {active ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          {active ? "Exit board mode" : "Board presentation"}
        </ActionButton>
        {active ? (
          <ActionButton variant="outline" onClick={() => setAutoScroll(!autoScroll)}>
            {autoScroll ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            Auto-scroll
          </ActionButton>
        ) : null}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={active ? "board" : "normal"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
