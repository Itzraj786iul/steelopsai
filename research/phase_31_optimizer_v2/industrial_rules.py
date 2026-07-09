"""Industrial rule engine with trace — Phase 31."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from phase31_config import BURDEN_COLS, LITERATURE_REFS


@dataclass
class RuleStep:
    rule_id: str
    description: str
    status: str  # Satisfied | Violated | Informational
    detail: str = ""


@dataclass
class RuleTrace:
    steps: list[RuleStep] = field(default_factory=list)
    satisfied: int = 0
    violated: int = 0

    def add(self, rule_id: str, description: str, status: str, detail: str = "") -> None:
        self.steps.append(RuleStep(rule_id, description, status, detail))
        if status == "Satisfied":
            self.satisfied += 1
        elif status == "Violated":
            self.violated += 1


class IndustrialRuleEngine:
    """Rules from Phase 30 operating practice, literature, and JSPL norms."""

    def evaluate(
        self,
        candidate: dict[str, Any],
        current: dict[str, Any],
        physics_violations: list[str],
    ) -> RuleTrace:
        trace = RuleTrace()
        hm_d = candidate["HM"] - current["HM"]
        dri_d = candidate["DRI"] - current["DRI"]
        bucket_d = candidate["Bucket"] - current["Bucket"]

        # Rule 1 — HM–DRI trade maintains metallic burden
        if abs(hm_d) > 0.05 or abs(dri_d) > 0.05:
            metallic_delta = hm_d + dri_d + (candidate["HBI"] - current["HBI"]) + bucket_d
            if abs(metallic_delta) <= 0.5:
                trace.add(
                    "Rule 1",
                    f"HM {'reduced' if hm_d < 0 else 'increased'} by {abs(hm_d):.1f} t → DRI {'increased' if dri_d > 0 else 'adjusted'} by {abs(dri_d):.1f} t → maintains total metallic burden",
                    "Satisfied",
                    LITERATURE_REFS["burden"],
                )
            else:
                trace.add(
                    "Rule 1",
                    "Metallic burden not conserved in HM–DRI trade",
                    "Violated",
                    f"Net metallic delta {metallic_delta:.1f} t",
                )
        else:
            trace.add("Rule 1", "HM–DRI unchanged", "Satisfied", "No burden trade required")

        # Rule 2 — Bucket up implies higher melting load
        if bucket_d > 0.5:
            trace.add(
                "Rule 2",
                f"Bucket increased by {bucket_d:.1f} t → cold charge load increases",
                "Informational",
                f"{LITERATURE_REFS['scrap']}; do not recommend simultaneous aggressive flux cut",
            )
        elif bucket_d < -0.5:
            trace.add(
                "Rule 2",
                f"Bucket reduced by {abs(bucket_d):.1f} t → structured metallic burden favoured",
                "Satisfied",
                LITERATURE_REFS["scrap"],
            )

        # Rule 3 — High DRI caution
        if candidate["DRI"] > 67.0:
            trace.add(
                "Rule 3",
                f"High DRI level ({candidate['DRI']:.1f} t) — elevated solid melting duty",
                "Informational",
                "JSPL Phase 30 live heat 4618208",
            )

        # Rule 4 — Lime/dolomite balance
        ratio = candidate["LIME"] / max(candidate["DOLO"], 0.1)
        if ratio > 8 or ratio < 3:
            trace.add("Rule 4", f"Lime/dolomite ratio {ratio:.1f} may be imbalanced", "Violated", LITERATURE_REFS["flux"])
        else:
            trace.add("Rule 4", "Lime/dolomite ratio within normal practice", "Satisfied", LITERATURE_REFS["flux"])

        # Rule 5 — Oxygen program (not final consumption outcome in V2)
        oxy_d = candidate["OXY"] - current["OXY"]
        if abs(oxy_d) > 0:
            direction = "increased" if oxy_d > 0 else "reduced"
            trace.add(
                "Rule 5",
                f"Target oxygen program {direction} by {abs(oxy_d):.0f} Nm³",
                "Satisfied" if abs(oxy_d / max(current["OXY"], 1)) < 0.08 else "Informational",
                LITERATURE_REFS["oxygen"],
            )

        # Rule 6 — Carbon program
        cpc_d = candidate["CPC"] - current["CPC"]
        if abs(cpc_d) > 10:
            trace.add(
                "Rule 6",
                f"Target carbon program adjusted by {cpc_d:+.0f} kg",
                "Satisfied" if abs(cpc_d / max(current["CPC"], 1)) < 0.12 else "Informational",
                LITERATURE_REFS["carbon"],
            )

        # Rule 7 — EE_KWH not optimized (outcome held)
        trace.add(
            "Rule 7",
            "Electrical Energy (kWh) held at current heat value — outcome variable, not optimized",
            "Satisfied",
            LITERATURE_REFS["energy"],
        )

        # Rule 8 — Physics engine propagation
        for v in physics_violations:
            trace.add("Rule 8", v, "Violated", "Physics constraint engine")

        if not physics_violations:
            trace.add("Rule 8", "All physics constraints passed", "Satisfied", "")

        return trace
