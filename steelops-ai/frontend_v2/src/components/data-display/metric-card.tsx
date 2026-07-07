"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { industrialEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  highlight?: boolean;
}

export function MetricCard({ label, value, delta, trend = "neutral", className, highlight }: MetricCardProps) {
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={industrialEase}
      whileHover={{ y: -2 }}
    >
      <Card
        className={cn(
          "border-border/80 shadow-elevation-sm transition-shadow hover:shadow-elevation-md",
          highlight && "border-primary/30 bg-primary/5",
          className
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-label">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-3">
            <p className="font-mono text-3xl font-semibold tracking-tight">{value}</p>
            {delta ? (
              <Badge variant={trend === "down" ? "destructive" : trend === "up" ? "success" : "muted"}>
                <TrendIcon className="mr-1 h-3 w-3" />
                {delta}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
