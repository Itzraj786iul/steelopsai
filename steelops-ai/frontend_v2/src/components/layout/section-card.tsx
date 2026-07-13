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
}

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
  actions,
  animate = true,
}: SectionCardProps) {
  const card = (
    <Card
      className={cn(
        "min-w-0 overflow-hidden border-border/80 shadow-elevation-sm transition-shadow hover:shadow-elevation-md",
        className
      )}
    >
      {title ? (
        <CardHeader className="flex flex-col gap-3 space-y-0 p-4 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:p-6 sm:pb-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <CardTitle className="text-heading-sm break-words">{title}</CardTitle>
            {description ? (
              <CardDescription className="text-sm break-words">{description}</CardDescription>
            ) : null}
          </div>
          {actions ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {actions}
            </div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("p-4 sm:p-6", !title && "pt-4 sm:pt-6", title && "pt-0", contentClassName)}>
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
