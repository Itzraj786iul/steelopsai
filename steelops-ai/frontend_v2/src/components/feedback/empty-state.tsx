"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { motion } from "framer-motion";

import { ActionButton } from "@/components/data-display/action-button";
import { fadeUp, industrialEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  icon: Icon = Inbox,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/10 px-6 py-16 text-center",
        className
      )}
      role="status"
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-elevation-sm">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <h3 className="text-heading-sm">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {(actionLabel && onAction) || (secondaryLabel && onSecondary) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction ? (
            <motion.div whileTap={{ scale: 0.98 }} transition={industrialEase}>
              <ActionButton onClick={onAction}>{actionLabel}</ActionButton>
            </motion.div>
          ) : null}
          {secondaryLabel && onSecondary ? (
            <ActionButton variant="outline" onClick={onSecondary}>
              {secondaryLabel}
            </ActionButton>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}
