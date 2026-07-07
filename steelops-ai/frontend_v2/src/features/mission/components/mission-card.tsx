"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatDurationMinutes } from "@/lib/date-utils";
import type { MissionHeat } from "@/features/mission/utils/mission-utils";
import { industrialEase } from "@/lib/motion";

interface MissionCardProps {
  mission: MissionHeat;
  rank?: number;
}

export const MissionCard = memo(function MissionCard({ mission, rank }: MissionCardProps) {
  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={industrialEase}
      className="group rounded-2xl border border-border/70 bg-card/80 p-5 shadow-elevation-sm transition-shadow hover:border-primary/40 hover:shadow-elevation-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {rank === 1 ? (
            <Badge className="mb-2 bg-primary/20 text-primary">Recommended first</Badge>
          ) : null}
          <h3 className="text-heading-sm leading-snug">{mission.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{mission.subtitle}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-2xl font-bold text-primary">{mission.priorityScore}</p>
          <p className="text-[10px] uppercase text-muted-foreground">Priority</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Meta label="How certain is AI?" value={`${mission.confidence} (${mission.confidenceScore}%)`} />
        <Meta label="Expected saving" value={formatCurrency(mission.businessValueInr)} accent />
        <Meta label="Time to save" value={formatDurationMinutes(mission.minutesToSave)} />
        <Meta label="Risk" value={mission.risk} warn={mission.risk !== "LOW"} />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{mission.operatorImpact}</p>

      <Link
        href={`/copilot?heatId=${mission.id}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity group-hover:opacity-95 focus-ring"
      >
        Start
        <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.article>
  );
});

function Meta({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`font-medium ${accent ? "text-accent" : warn ? "text-warning" : ""}`}>{value}</p>
    </div>
  );
}

interface MissionCardGridProps {
  missions: MissionHeat[];
}

export const MissionCardGrid = memo(function MissionCardGrid({ missions }: MissionCardGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" role="list">
      {missions.map((mission, i) => (
        <div key={mission.id} role="listitem">
          <MissionCard mission={mission} rank={i === 0 ? 1 : undefined} />
        </div>
      ))}
    </div>
  );
});
