"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Bot, ThumbsUp, AlertTriangle } from "lucide-react";

import { ConfidenceBadge } from "@/features/preheat/components/confidence-badge";
import { humanize } from "@/lib/human-language";
import type { LiveHeatDetail } from "@/types/live.types";
import { useCelebrationStore } from "@/stores/celebration-store";

export const AICoachPanel = memo(function AICoachPanel({ detail }: { detail: LiveHeatDetail }) {
  const top = detail.recommendations[0];
  const trigger = useCelebrationStore((s) => s.trigger);

  const coachMessage = top
    ? top.reason?.toLowerCase().includes("delay") || detail.health_band === "WARNING"
      ? {
          tone: "alert" as const,
          headline: "Power trend indicates possible delay",
          body: top.action_text,
          advice: top.expected_benefit ?? "Adjust next bucket per playbook",
        }
      : {
          tone: "stable" as const,
          headline: "Arc energy stable",
          body: "Continue current practice",
          advice: top.action_text,
        }
    : {
        tone: "stable" as const,
        headline: "Process within playbook",
        body: "Continue current practice",
        advice: "Monitor phosphorus and power every 5 minutes",
      };

  const confidence = (top?.confidence ?? 0.85) * 100;
  const tier = confidence >= 80 ? "HIGH" : confidence >= 60 ? "MEDIUM" : "LOW";

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/5 to-card shadow-elevation-md">
      <div className="border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <p className="text-label">AI Coach</p>
            <h2 className="text-heading-md">What to do now</h2>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin">
        <motion.div
          key={coachMessage.headline}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-4 ${
            coachMessage.tone === "alert" ? "border-warning/40 bg-warning/5" : "border-accent/30 bg-accent/5"
          }`}
        >
          <div className="flex items-start gap-2">
            {coachMessage.tone === "alert" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            ) : (
              <ThumbsUp className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            )}
            <div>
              <p className="font-semibold">{coachMessage.headline}</p>
              <p className="mt-2 text-sm leading-relaxed">{coachMessage.body}</p>
              <p className="mt-3 rounded-lg bg-background/60 px-3 py-2 text-sm font-medium">{coachMessage.advice}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{humanize("How certain is AI?")}</span>
            <ConfidenceBadge tier={tier} score={confidence} />
          </div>
        </motion.div>

        {detail.playbook_violations.length > 0 ? (
          <section>
            <p className="text-label mb-2">Playbook alerts</p>
            <ul className="space-y-1 text-sm text-warning">
              {detail.playbook_violations.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section>
          <p className="text-label mb-2">Next actions</p>
          <ol className="space-y-2 text-sm">
            {detail.recommendations.slice(0, 3).map((rec, index) => (
              <li key={rec.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border/60 px-3 py-2 text-left hover:border-primary/40 focus-ring"
                  onClick={() => trigger("recommendation_accepted", rec.action_text)}
                >
                  <span className="font-semibold text-primary">{index + 1}. </span>
                  {rec.action_text}
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </aside>
  );
});
