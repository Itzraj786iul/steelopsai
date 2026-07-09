"""Physics constraint engine — Phase 31 optimizer V2."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd

from phase31_config import (
    ADJUSTMENT,
    BURDEN_COLS,
    CHARGE_MAX_T,
    CHARGE_MIN_T,
    PLANNING_DECISION_VARS,
)


def total_charge(recipe: dict[str, Any]) -> float:
    return float(sum(float(recipe.get(c, 0) or 0) for c in BURDEN_COLS))


def rel_change(a: float, b: float) -> float:
    return abs(b - a) / max(abs(a), 1e-6)


@dataclass
class ConstraintCheck:
    rule_id: str
    rule_name: str
    passed: bool
    message: str


@dataclass
class PhysicsResult:
    feasible: bool
    checks: list[ConstraintCheck] = field(default_factory=list)
    violations: list[str] = field(default_factory=list)

    def add(self, rule_id: str, name: str, passed: bool, message: str) -> None:
        self.checks.append(ConstraintCheck(rule_id, name, passed, message))
        if not passed:
            self.violations.append(f"{rule_id}: {message}")
        self.feasible = self.feasible and passed


class PhysicsConstraintEngine:
    """Modular industrial physics checks for candidate recipes."""

    def __init__(self, operating_windows: pd.DataFrame) -> None:
        self.windows = operating_windows

    def _p5(self, var: str) -> float:
        if var in self.windows.index:
            return float(self.windows.loc[var, "P5"])
        row = self.windows[self.windows.get("variable", pd.Series()) == var] if "variable" in self.windows.columns else pd.DataFrame()
        return float(row["p5"].iloc[0]) if len(row) else -np.inf

    def _p95(self, var: str) -> float:
        if var in self.windows.index:
            return float(self.windows.loc[var, "P95"])
        row = self.windows[self.windows.get("variable", pd.Series()) == var] if "variable" in self.windows.columns else pd.DataFrame()
        return float(row["p95"].iloc[0]) if len(row) else np.inf

    def check(
        self,
        candidate: dict[str, Any],
        current: dict[str, Any],
        *,
        power_restricted: bool = False,
    ) -> PhysicsResult:
        result = PhysicsResult(feasible=True)
        cfg = ADJUSTMENT

        # R1 — HM–DRI inverse coupling
        hm_chg = candidate["HM"] - current["HM"]
        dri_chg = candidate["DRI"] - current["DRI"]
        if hm_chg * dri_chg > 0 and abs(hm_chg) > 0.05 and abs(dri_chg) > 0.05:
            result.add("R1", "HM–DRI inverse coupling", False, "HM and DRI moved in same direction")
        else:
            result.add("R1", "HM–DRI inverse coupling", True, "Coupling satisfied")

        # R2 — Total charge balance band
        charge = total_charge(candidate)
        if charge < CHARGE_MIN_T or charge > CHARGE_MAX_T:
            result.add("R2", "Total charge balance", False, f"Charge {charge:.1f} t outside {CHARGE_MIN_T}–{CHARGE_MAX_T} t")
        else:
            result.add("R2", "Total charge balance", True, f"Charge {charge:.1f} t within band")

        # R3 — Charge drift from current
        orig = total_charge(current)
        if abs(charge - orig) > cfg["charge_tolerance_t"]:
            result.add("R3", "Burden drift limit", False, f"Charge drift {abs(charge - orig):.1f} t exceeds tolerance")
        else:
            result.add("R3", "Burden drift limit", True, "Charge held near current")

        # R4 — Flux ratio LIME/DOLO
        cur_ratio = current["LIME"] / max(current["DOLO"], 0.1)
        cand_ratio = candidate["LIME"] / max(candidate["DOLO"], 0.1)
        if abs(cand_ratio - cur_ratio) / max(cur_ratio, 0.1) > 0.20:
            result.add("R4", "Flux ratio limits", False, "LIME/DOLO ratio shift >20%")
        else:
            result.add("R4", "Flux ratio limits", True, "Flux ratio stable")

        # R5 — Scrap / HBI limits
        if candidate["Bucket"] > self._p95("Bucket") * 1.05:
            result.add("R5", "Scrap operating limit", False, "Bucket above historical P95")
        elif candidate["HBI"] > max(self._p95("HBI"), 10) and current["HBI"] == 0:
            result.add("R5", "HBI operating limit", False, "HBI introduced from zero without campaign context")
        else:
            result.add("R5", "Scrap/HBI limits", True, "Within scrap/HBI envelope")

        # R6 — Oxygen program consistency
        oxy_drop = max(0.0, current["OXY"] - candidate["OXY"]) / max(current["OXY"], 1e-6)
        if oxy_drop > 0.08 and candidate["DRI"] > current["DRI"] + 1.0:
            result.add("R6", "Oxygen program consistency", False, "Large O₂ cut with higher DRI — inconsistent refining load")
        else:
            result.add("R6", "Oxygen program consistency", True, "Oxygen program consistent with burden")

        # R7 — Carbon–oxygen coordination
        c_up = candidate["CPC"] > current["CPC"] * 1.08
        o_down = candidate["OXY"] < current["OXY"] * 0.95
        if c_up and o_down:
            result.add("R7", "Carbon–oxygen coordination", False, "Carbon up and oxygen down — foaming/refining conflict")
        else:
            result.add("R7", "Carbon–oxygen coordination", True, "C/O programs coordinated")

        # R8 — Power restriction (planning: no POWER in vector; informational)
        if power_restricted:
            result.add("R8", "Power restriction logic", True, "Restriction active — energy outcome held at current")
        else:
            result.add("R8", "Power restriction logic", True, "No restriction flag")

        # R9 — Historical envelope (planning vars only)
        for var in PLANNING_DECISION_VARS:
            val = float(candidate[var])
            if val < self._p5(var) * 0.92 or val > self._p95(var) * 1.08:
                result.add(
                    "R9",
                    "Historical operating envelope",
                    False,
                    f"{var}={val:.1f} outside soft P5–P95 envelope",
                )
                break
        else:
            result.add("R9", "Historical operating envelope", True, "All planning vars within envelope")

        # R10 — Local window per variable
        for var, limit in [
            ("HM", cfg["HM_pct"]),
            ("DRI", cfg["DRI_pct"]),
            ("LIME", cfg["LIME_pct"]),
            ("DOLO", cfg["DOLO_pct"]),
            ("CPC", cfg["CPC_pct"]),
            ("OXY", cfg["OXY_pct"]),
        ]:
            if rel_change(float(current[var]), float(candidate[var])) > limit + 1e-9:
                result.add("R10", "Local operating window", False, f"{var} change exceeds {limit*100:.0f}% local window")
                return result
        if abs(candidate["Bucket"] - current["Bucket"]) > cfg["Bucket_abs"] + 1e-9:
            result.add("R10", "Local operating window", False, "Bucket change exceeds absolute limit")
            return result
        if abs(candidate["HBI"] - current["HBI"]) > cfg["HBI_abs"] + 1e-9:
            result.add("R10", "Local operating window", False, "HBI change exceeds absolute limit")
            return result
        result.add("R10", "Local operating window", True, "Local perturbation within limits")

        return result
