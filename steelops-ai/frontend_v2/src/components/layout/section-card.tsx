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
        "border-border/80 shadow-elevation-sm transition-shadow hover:shadow-elevation-md",
        className
      )}
    >
      {title ? (
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
          <div className="space-y-1.5">
            <CardTitle className="text-heading-sm">{title}</CardTitle>
            {description ? <CardDescription className="text-sm">{description}</CardDescription> : null}
          </div>
          {actions}
        </CardHeader>
      ) : null}
      <CardContent className={cn(!title && "pt-6", contentClassName)}>{children}</CardContent>
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
