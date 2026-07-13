"use client";

import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { SectionCard } from "@/components/layout/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeatWorkflowStrip } from "@/features/eaf/components/heat-workflow-strip";
import { eafApi } from "@/lib/api/eaf";
import { getApiErrorMessage } from "@/services/api-client";
import { useCurrentHeatStore } from "@/stores/current-heat-store";

export default function EafFeedbackPage() {
  const active = useCurrentHeatStore((s) => s.active);
  const [status, setStatus] = useState<"Accepted" | "Modified" | "Rejected">("Accepted");
  const [heat, setHeat] = useState("");
  const [optimizer, setOptimizer] = useState("Phase 20.2");
  const [comment, setComment] = useState("");
  const [constraint, setConstraint] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [impractical, setImpractical] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!active) return;
    setHeat((h) => active.heatNumber || h);
    setOptimizer(active.optimizerV2 ? "Phase 31 V2" : active.optimizer ? "Phase 20.2" : "Phase 20.2");
    if (active.recommendationAcceptance) setStatus(active.recommendationAcceptance);
  }, [active]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await eafApi.feedbackCreate({
        heat_number: heat,
        optimizer_used: optimizer,
        status,
        comment,
        constraint_issue: constraint,
        maintenance_issue: maintenance,
        impractical_reason: impractical,
      });
      setMessage("Feedback recorded for future research — models are not retrained from this form.");
      setComment("");
      setConstraint("");
      setMaintenance("");
      setImpractical("");
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, "Failed to submit feedback"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="Operator Feedback" description="Review optimizer recommendations — stored for research only">
      <HeatWorkflowStrip active={active} currentPage="feedback" className="mb-6" />
      <SectionCard title="Recommendation review">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Heat Number (optional)</Label>
            <Input className="mt-1" value={heat} onChange={(e) => setHeat(e.target.value)} />
          </div>
          <div>
            <Label>Optimizer Used</Label>
            <Input className="mt-1" value={optimizer} onChange={(e) => setOptimizer(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Decision</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["Accepted", "Modified", "Rejected"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={status === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatus(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Why was the recommendation changed?</Label>
            <Input className="mt-1" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div>
            <Label>Operational constraint?</Label>
            <Input className="mt-1" value={constraint} onChange={(e) => setConstraint(e.target.value)} />
          </div>
          <div>
            <Label>Maintenance issue?</Label>
            <Input className="mt-1" value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Was the recommendation impractical?</Label>
            <Input className="mt-1" value={impractical} onChange={(e) => setImpractical(e.target.value)} />
          </div>
        </div>
        <Button className="mt-4" onClick={submit} disabled={saving}>
          {saving ? "Submitting…" : "Submit feedback"}
        </Button>
        {message ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </SectionCard>
    </PageContainer>
  );
}
