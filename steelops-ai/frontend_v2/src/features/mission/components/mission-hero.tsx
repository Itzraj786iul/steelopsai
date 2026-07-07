"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { ActionButton } from "@/components/data-display/action-button";
import { greetingName, timeGreeting } from "@/lib/human-language";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";
import type { MissionStats } from "@/features/mission/utils/mission-utils";

interface MissionHeroProps {
  userName?: string | null;
  stats: MissionStats;
  firstHeatId?: string;
}

export const MissionHero = memo(function MissionHero({ userName, stats, firstHeatId }: MissionHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-8 shadow-glow-ai"
    >
      <div className="absolute right-6 top-6 opacity-15">
        <Sparkles className="h-24 w-24 text-primary" />
      </div>
      <p className="text-label">Today&apos;s Mission</p>
      <h1 className="mt-2 text-display-md">
        {timeGreeting()}, {greetingName(userName)}
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        <span className="font-semibold text-foreground">{stats.totalHeats} heats</span> on your shift today
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="AI believes under target" value={`${stats.underTargetCount} heats`} accent />
        <Stat label="Potential savings today" value={formatDurationMinutes(stats.recoverableMinutes)} />
        <Stat label="Business value" value={formatCurrency(stats.savingsInr)} accent />
        <Stat label="Need your attention" value={`${stats.attentionCount} heats`} warn={stats.attentionCount > 0} />
      </div>

      {firstHeatId ? (
        <div className="mt-8 flex flex-wrap gap-3">
          <ActionButton size="lg" asChild>
            <Link href={`/copilot?heatId=${firstHeatId}`}>
              Start first heat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ActionButton>
          <ActionButton size="lg" variant="outline" asChild>
            <Link href="/insights/control-tower">Mission control</Link>
          </ActionButton>
        </div>
      ) : null}
    </motion.section>
  );
});

function Stat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-4">
      <p className="text-label">{label}</p>
      <p className={`mt-1 font-mono text-xl font-semibold ${accent ? "text-accent" : warn ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}
