import { AlertTriangle, CheckCircle2 } from "lucide-react";

import type { PreheatDecisionPackage } from "@/types/preheat.types";

export function ValidationPanel({ pkg }: { pkg: PreheatDecisionPackage }) {
  const passed = pkg.validation_errors.length === 0;

  return (
    <div className="space-y-4">
      <div
        className={`flex items-center gap-3 rounded-lg border p-4 ${
          passed ? "border-success/40 bg-success/5" : "border-warning/40 bg-warning/5"
        }`}
      >
        {passed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <AlertTriangle className="h-5 w-5 text-warning" />}
        <div>
          <p className="font-medium">{passed ? "Validation passed" : "Validation warnings"}</p>
          <p className="text-sm text-muted-foreground">
            Trust score {pkg.confidence_score.toFixed(1)}% · {pkg.confidence_tier}
          </p>
        </div>
      </div>

      {pkg.validation_errors.length ? (
        <ul className="space-y-2 text-sm">
          {pkg.validation_errors.map((error) => (
            <li key={error} className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
              {error}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No validation blockers. Copilot ready: {pkg.copilot_ready ? "yes" : "no"}.</p>
      )}

      <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
        <p className="text-label">Execution feasibility</p>
        <p className="mt-2">{pkg.digital_twin_comparison.recommendation ?? "Feasible within shift constraints."}</p>
        <p className="mt-2 text-muted-foreground">Approval: {pkg.approval_requirements}</p>
      </div>
    </div>
  );
}
