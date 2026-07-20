"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/layout/section-card";
import { cn } from "@/lib/utils";

export interface ShortcutItem {
  href: string;
  label: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  icon?: LucideIcon;
}

interface ShortcutBarProps {
  title?: string;
  description?: string;
  items: ShortcutItem[];
  className?: string;
  /** When false, render only the button row (no SectionCard). */
  card?: boolean;
}

/**
 * Shared “Do next” / console shortcut row used across Manager & Admin homes.
 */
export function ShortcutBar({
  title = "Do next",
  description,
  items,
  className,
  card = true,
}: ShortcutBarProps) {
  const row = (
    <div className={cn("flex flex-wrap gap-2", !card && className)}>
      {items.map((item, i) => {
        const Icon = item.icon;
        const variant = item.variant ?? (i === 0 ? "default" : "outline");
        return (
          <Button key={item.href + item.label} asChild size="sm" variant={variant}>
            <Link href={item.href} className="inline-flex items-center gap-1.5">
              {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
              {item.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );

  if (!card) return row;

  return (
    <SectionCard title={title} description={description} className={className}>
      {row}
    </SectionCard>
  );
}
