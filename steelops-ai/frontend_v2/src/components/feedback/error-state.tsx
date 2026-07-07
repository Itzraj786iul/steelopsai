"use client";

import { AlertTriangle, CloudOff, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { fadeUp, industrialEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type ErrorVariant = "default" | "offline" | "api" | "prediction" | "twin";

const VARIANTS: Record<
  ErrorVariant,
  { icon: LucideIcon; title: string; border: string; bg: string; iconBg: string; iconColor: string }
> = {
  default: {
    icon: AlertTriangle,
    title: "Something went wrong",
    border: "border-destructive/30",
    bg: "bg-destructive/5",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  offline: {
    icon: WifiOff,
    title: "Connection lost",
    border: "border-warning/40",
    bg: "bg-warning/5",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  api: {
    icon: ServerCrash,
    title: "Service unavailable",
    border: "border-critical/30",
    bg: "bg-critical/5",
    iconBg: "bg-critical/10",
    iconColor: "text-critical",
  },
  prediction: {
    icon: CloudOff,
    title: "Prediction failed",
    border: "border-prediction/30",
    bg: "bg-prediction/5",
    iconBg: "bg-prediction/10",
    iconColor: "text-prediction",
  },
  twin: {
    icon: AlertTriangle,
    title: "Digital twin unavailable",
    border: "border-secondary/40",
    bg: "bg-secondary/5",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
};

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  variant?: ErrorVariant;
  className?: string;
}

export function ErrorState({ title, message, onRetry, variant = "default", className }: ErrorStateProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center",
        config.border,
        config.bg,
        className
      )}
      role="alert"
    >
      <div className={cn("mb-4 flex h-14 w-14 items-center justify-center rounded-2xl", config.iconBg)}>
        <Icon className={cn("h-6 w-6", config.iconColor)} aria-hidden />
      </div>
      <h3 className="text-heading-sm">{title ?? config.title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{message}</p>
      {onRetry ? (
        <motion.div className="mt-6" whileTap={{ scale: 0.98 }} transition={industrialEase}>
          <ActionButton variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 motion-safe:group-hover:animate-spin" />
            Try again
          </ActionButton>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
