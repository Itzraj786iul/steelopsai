"use client";

import { useEffect } from "react";

import { useCommandPaletteStore } from "@/stores/command-palette-store";

export function useCommandPalette() {
  const { open, setOpen } = useCommandPaletteStore();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  return { open, setOpen };
}
