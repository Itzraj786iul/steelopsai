"use client";

import { motion } from "framer-motion";

import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  actions?: React.ReactNode;
  animate?: boolean;
  /** quiet = no hover lift; panel = muted inset surface for secondary content */
  tone?: "default" | "quiet" | "panel" | "emphasis";
}

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  actions,
  animate = true,
  tone = "default",
}: SectionCardProps) {
  const card = (
    <Card
      className={cn(
        "min-w-0 overflow-hidden border-border/80",
        tone === "default" && "shadow-elevation-sm transition-shadow hover:shadow-elevation-md",
        tone === "quiet" && "shadow-none",
        tone === "panel" && "bg-muted/20 shadow-none",
        tone === "emphasis" && "border-primary/25 shadow-elevation-sm ring-1 ring-primary/10",
        className
      )}
    >
      {title ? (
        <CardHeader className="flex flex-col gap-2 space-y-0 p-4 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-5 sm:pb-3">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-heading-sm break-words">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-sm break-words leading-snug">{description}</CardDescription>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {actions}
            </div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent
        className={cn(
          "p-4 sm:p-5",
          !title && "pt-4 sm:pt-5",
          title && "pt-0",
          contentClassName
        )}
      >
        {children}
      </CardContent>
    </Card>
  );

  if (!animate) return card;

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      whileInView="animate"
      viewport={{ once: true, margin: "-40px" }}
    >
      {card}
    </motion.div>
  );
}
