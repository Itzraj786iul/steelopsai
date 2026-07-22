"""
Phase 20.2 - Physics-Guided Industrial Recipe Optimizer.

Hybrid ML + process-knowledge local search around the CURRENT recipe.
Uses frozen Phase 19 model. No retraining.
"""

from __future__ import annotations

import json
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from tabulate import tabulate
from tqdm import tqdm

from feature_engineering import MODEL_FEATURES, OPERATOR_COLS, engineer_recipe_features, normalize_shift


RANDOM_STATE = 42
PHASE_ROOT = Path(__file__).resolve().parent
EXPORTS_DIR = PHASE_ROOT / "exports"

PHASE19_EXPORTS = PHASE_ROOT.parent / "phase_19_model_development" / "exports"
PHASE16_DATASET = PHASE_ROOT.parent / "phase_16_feature_engineering" / "engineered_normal_ttt_dataset.csv"
CLEANED_DATASET = PHASE_ROOT.parent / "phase_13_industrial_cleaning" / "final_model_dataset.csv"
MODEL_PATH = PHASE19_EXPORTS / "production_model.pkl"
PREPROC_PATH = PHASE19_EXPORTS / "preprocessing_pipeline.pkl"

CONTROLLABLE_NUMERIC = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY"]
# Planning-safe neighbour distance (exclude POWER — post-heat EE outcome)
PLANNING_SIM_COLS = ["HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "OXY"]
SIM_FEATURE_WEIGHTS = {
    "HM": 1.35,
    "DRI": 1.35,
    "HBI": 0.90,
    "Bucket": 1.15,
    "LIME": 0.85,
    "DOLO": 0.85,
    "CPC": 0.70,
    "OXY": 0.75,
}
BURDEN_COLS = ["HM", "DRI", "HBI", "Bucket"]
# Advisory plant band (aligned with prediction / UI 80–150 t).
# Hard rejection previously used 115–150 and blocked real heats (~110 t).
CHARGE_MIN_T = 80.0
CHARGE_MAX_T = 150.0

POWER_REDUCTION_EXEMPT_PCT = 0.01
IMPROVEMENT_EXEMPT_MIN = 2.0
POWER_PHYSICS_PENALTY_SCALE = 8.0
OXY_REDUCTION_EXEMPT_PCT = 0.02
OXY_PHYSICS_PENALTY_SCALE = 6.0
FLUX_RATIO_MAX_CHANGE = 0.15
CPC_MAX_CHANGE = 0.15
HISTORICAL_EXTREME_PERCENTILE = 0.95
HM_DRI_MIN_MOVE_T = 0.05

PIPELINE_START = time.perf_counter()


def section(title: str) -> None:
    print("\n" + "=" * 76)
    print(title)
    print("=" * 76)


def print_table(rows: list[list[Any]], headers: list[str]) -> None:
    print(tabulate(rows, headers=headers, tablefmt="github", floatfmt=".4f"))


@dataclass
class AdjustmentConfig:
    hm_pct: float = 0.03
    dri_pct: float = 0.03
    hbi_abs_t: float = 2.0
    bucket_abs_t: float = 3.0
    lime_pct: float = 0.10
    dolo_pct: float = 0.10
    cpc_pct: float = 0.10
    power_pct: float = 0.05
    oxy_pct: float = 0.05
    charge_tolerance_t: float = 2.0
    n_generate: int = 250


@dataclass
class ValidationResult:
    accepted: bool
    reason: str = ""


@dataclass
class ScoreBreakdown:
    predicted_ttt: float
    industrial_penalty: float
    physics_penalty: float
    historical_penalty: float
    total_score: float
    improvement_min: float


@dataclass
class HistoricalSimilarityIndex:
    matrix: np.ndarray
    mean: np.ndarray
    std: np.ndarray
    weights: np.ndarray
    cols: list[str]
    extreme_threshold: float
    hist_norm: np.ndarray | None = None

    @classmethod
    def from_dataframe(cls, df: pd.DataFrame) -> HistoricalSimilarityIndex:
        cols = [c for c in PLANNING_SIM_COLS if c in df.columns]
        matrix = df[cols].to_numpy(dtype=float)
        mean = matrix.mean(axis=0)
        std = matrix.std(axis=0)
        std[std < 1e-6] = 1.0
        weights = np.array([SIM_FEATURE_WEIGHTS.get(c, 1.0) for c in cols], dtype=float)
        hist_norm = (matrix - mean) / std
        sample_size = min(2000, len(hist_norm))
        rng = np.random.default_rng(RANDOM_STATE)
        idx = rng.choice(len(hist_norm), size=sample_size, replace=False)
        sample = hist_norm[idx] * weights
        dists: list[float] = []
        for row in sample:
            diff = sample - row
            dists.extend(np.sqrt((diff * diff).sum(axis=1)))
        extreme = float(np.percentile(dists, HISTORICAL_EXTREME_PERCENTILE * 100))
        return cls(
            matrix=matrix,
            mean=mean,
            std=std,
            weights=weights,
            cols=cols,
            extreme_threshold=extreme,
            hist_norm=hist_norm,
        )

    def nearest_distance(self, recipe: dict[str, Any]) -> float:
        vec = np.array([float(recipe[c]) for c in self.cols], dtype=float)
        normed = (vec - self.mean) / self.std
        # Cache hist_norm on the index — recomputing every candidate was O(n)×candidates.
        hist_norm = self.hist_norm if self.hist_norm is not None else (self.matrix - self.mean) / self.std
        if self.hist_norm is None:
            self.hist_norm = hist_norm
        diff = (hist_norm - normed) * self.weights
        return float(np.sqrt((diff * diff).sum(axis=1)).min())


def total_charge(recipe: dict[str, Any]) -> float:
    return float(recipe["HM"] + recipe["DRI"] + recipe["HBI"] + recipe["Bucket"])


def within_historical(operating_windows: pd.DataFrame, var: str, value: float) -> bool:
    lo = float(operating_windows.loc[var, "P5"])
    hi = float(operating_windows.loc[var, "P95"])
    return lo <= value <= hi


def local_limit(var: str, current: float, cfg: AdjustmentConfig) -> float:
    limits = {
        "HBI": cfg.hbi_abs_t,
        "Bucket": cfg.bucket_abs_t,
        "LIME": cfg.lime_pct * max(current, 1e-6),
        "DOLO": cfg.dolo_pct * max(current, 1e-6),
        "CPC": cfg.cpc_pct * max(current, 1e-6),
        "POWER": cfg.power_pct * max(current, 1e-6),
        "OXY": cfg.oxy_pct * max(current, 1e-6),
        "HM": cfg.hm_pct * max(current, 1e-6),
        "DRI": cfg.dri_pct * max(current, 1e-6),
    }
    return limits.get(var, 0.0)


def within_historical_or_local(
    operating_windows: pd.DataFrame,
    var: str,
    value: float,
    current: float,
    cfg: AdjustmentConfig,
) -> bool:
    if within_historical(operating_windows, var, value):
        return True
    return abs(value - current) <= local_limit(var, current, cfg) + 1e-6


def lime_dolo_ratio(recipe: dict[str, Any]) -> float:
    dolo = max(float(recipe["DOLO"]), 1e-6)
    return float(recipe["LIME"]) / dolo


def flux_ratio_change(current: dict[str, Any], candidate: dict[str, Any]) -> float:
    r0 = lime_dolo_ratio(current)
    r1 = lime_dolo_ratio(candidate)
    return abs(r1 - r0) / max(r0, 1e-6)


def rel_change(current: float, candidate: float) -> float:
    return abs(candidate - current) / max(abs(current), 1e-6)


def validate_candidate(
    candidate: dict[str, Any],
    current: dict[str, Any],
    original_charge: float,
    power_restricted: bool,
    operating_windows: pd.DataFrame,
    hist_index: HistoricalSimilarityIndex,
    cfg: AdjustmentConfig,
) -> ValidationResult:
    charge = total_charge(candidate)

    # Keep candidates near the current heat charge. Expand the absolute band
    # when the current heat is already outside the advisory 80–150 t range
    # so optimization still works (same policy as advisory prediction).
    band_lo = min(CHARGE_MIN_T, original_charge)
    band_hi = max(CHARGE_MAX_T, original_charge)
    if charge < band_lo or charge > band_hi:
        return ValidationResult(
            False,
            f"Charge imbalance (outside {band_lo:.0f}-{band_hi:.0f} t band)",
        )

    if abs(charge - original_charge) > cfg.charge_tolerance_t:
        return ValidationResult(False, "Charge imbalance (>2 t from current)")

    hm_chg = candidate["HM"] - current["HM"]
    dri_chg = candidate["DRI"] - current["DRI"]

    if hm_chg * dri_chg > 0 and abs(hm_chg) > HM_DRI_MIN_MOVE_T and abs(dri_chg) > HM_DRI_MIN_MOVE_T:
        return ValidationResult(False, "HM/DRI violation (same direction)")

    if abs(hm_chg) / max(current["HM"], 1e-6) > cfg.hm_pct + 1e-9:
        return ValidationResult(False, "Outside operating window (HM)")

    hbi_chg = candidate["HBI"] - current["HBI"]
    bucket_chg = candidate["Bucket"] - current["Bucket"]
    charge_balanced = abs(hm_chg + dri_chg + hbi_chg + bucket_chg) <= 0.25
    max_dri_move = max(
        cfg.dri_pct * max(current["DRI"], 1e-6),
        abs(hm_chg) + abs(hbi_chg) + abs(bucket_chg) + 0.5,
    )
    if abs(dri_chg) > max_dri_move + 1e-9 and not charge_balanced:
        return ValidationResult(False, "Outside operating window (DRI)")

    if abs(hbi_chg) > cfg.hbi_abs_t + 1e-9:
        return ValidationResult(False, "Outside operating window (HBI)")
    if abs(bucket_chg) > cfg.bucket_abs_t + 1e-9:
        return ValidationResult(False, "Outside operating window (Bucket)")

    for var, pct in [("LIME", cfg.lime_pct), ("DOLO", cfg.dolo_pct), ("CPC", cfg.cpc_pct)]:
        if rel_change(current[var], candidate[var]) > pct + 1e-9:
            return ValidationResult(False, f"Outside operating window ({var})")

    if rel_change(current["POWER"], candidate["POWER"]) > cfg.power_pct + 1e-9:
        return ValidationResult(False, "Outside operating window (POWER)")

    if rel_change(current["OXY"], candidate["OXY"]) > cfg.oxy_pct + 1e-9:
        return ValidationResult(False, "Outside operating window (OXY)")

    if power_restricted and candidate["POWER"] > current["POWER"] + 1e-6:
        return ValidationResult(False, "Power rule (increase under restriction)")

    # Power decreases scored via physics penalty (not hard-rejected unless restriction).
    oxy_in_band = within_historical(operating_windows, "OXY", current["OXY"])
    if oxy_in_band and not power_restricted:
        oxy_drop_pct = max(0.0, current["OXY"] - candidate["OXY"]) / max(current["OXY"], 1e-6)
        if oxy_drop_pct > OXY_REDUCTION_EXEMPT_PCT + 1e-9:
            return ValidationResult(False, "Oxygen rule (large reduction)")

    if flux_ratio_change(current, candidate) > FLUX_RATIO_MAX_CHANGE + 1e-9:
        return ValidationResult(False, "Flux rule (LIME/DOLO ratio)")

    for var in CONTROLLABLE_NUMERIC:
        if not within_historical_or_local(
            operating_windows, var, float(candidate[var]), float(current[var]), cfg
        ):
            return ValidationResult(False, "Outside operating window")

    nn_dist = hist_index.nearest_distance(candidate)
    if nn_dist > hist_index.extreme_threshold * 1.15:
        return ValidationResult(False, "Historical similarity (extreme outlier)")

    return ValidationResult(True, "Accepted")


def compute_industrial_penalty(
    candidate: dict[str, Any],
    current: dict[str, Any],
    original_charge: float,
    operating_windows: pd.DataFrame,
    cfg: AdjustmentConfig,
) -> float:
    penalty = 0.0

    def rel(var: str) -> float:
        return rel_change(current[var], candidate[var])

    penalty += 2.5 * rel("HM")
    penalty += 2.5 * rel("DRI")
    penalty += 0.8 * max(0.0, candidate["Bucket"] - current["Bucket"])
    penalty += 0.8 * max(0.0, candidate["HBI"] - current["HBI"])
    penalty += 1.5 * rel("CPC")
    penalty += 1.0 * (rel("LIME") + rel("DOLO"))
    penalty += 2.0 * max(0.0, current["OXY"] - candidate["OXY"]) / max(current["OXY"], 1e-6)
    penalty += 0.6 * rel("POWER")
    penalty += 1.5 * abs(total_charge(candidate) - original_charge)

    for var in CONTROLLABLE_NUMERIC:
        if within_historical(operating_windows, var, float(candidate[var])):
            continue
        if within_historical_or_local(
            operating_windows, var, float(candidate[var]), float(current[var]), cfg
        ):
            penalty += 1.0
        else:
            penalty += 3.0

    hm_chg = candidate["HM"] - current["HM"]
    dri_chg = candidate["DRI"] - current["DRI"]
    if hm_chg * dri_chg > 0:
        penalty += 2.0

    return float(penalty)


def physics_penalty(
    candidate: dict[str, Any],
    current: dict[str, Any],
    operating_windows: pd.DataFrame,
    power_restricted: bool,
    predicted_ttt: float,
    current_ttt: float,
) -> float:
    penalty = 0.0
    improvement = current_ttt - predicted_ttt

    if power_restricted:
        if candidate["POWER"] > current["POWER"] + 1e-6:
            penalty += 10.0
    else:
        power_drop_pct = max(0.0, current["POWER"] - candidate["POWER"]) / max(current["POWER"], 1e-6)
        if power_drop_pct > POWER_REDUCTION_EXEMPT_PCT and improvement < IMPROVEMENT_EXEMPT_MIN:
            penalty += POWER_PHYSICS_PENALTY_SCALE * power_drop_pct

    oxy_in_band = within_historical(operating_windows, "OXY", current["OXY"])
    if oxy_in_band and not power_restricted:
        oxy_drop_pct = max(0.0, current["OXY"] - candidate["OXY"]) / max(current["OXY"], 1e-6)
        if oxy_drop_pct > OXY_REDUCTION_EXEMPT_PCT:
            penalty += OXY_PHYSICS_PENALTY_SCALE * oxy_drop_pct

    ratio_chg = flux_ratio_change(current, candidate)
    if ratio_chg > FLUX_RATIO_MAX_CHANGE * 0.5:
        penalty += 4.0 * (ratio_chg - FLUX_RATIO_MAX_CHANGE * 0.5)

    cpc_chg = rel_change(current["CPC"], candidate["CPC"])
    if cpc_chg > CPC_MAX_CHANGE and improvement < IMPROVEMENT_EXEMPT_MIN:
        penalty += 5.0 * (cpc_chg - CPC_MAX_CHANGE)

    return float(penalty)


def historical_similarity_penalty(
    candidate: dict[str, Any],
    hist_index: HistoricalSimilarityIndex,
) -> float:
    dist = hist_index.nearest_distance(candidate)
    if dist <= hist_index.extreme_threshold:
        return 0.0
    excess = dist - hist_index.extreme_threshold
    return float(2.5 * excess)


def score_candidate(
    candidate: dict[str, Any],
    current: dict[str, Any],
    original_charge: float,
    operating_windows: pd.DataFrame,
    hist_index: HistoricalSimilarityIndex,
    power_restricted: bool,
    predicted_ttt: float,
    current_ttt: float,
    cfg: AdjustmentConfig,
) -> ScoreBreakdown:
    industrial = compute_industrial_penalty(candidate, current, original_charge, operating_windows, cfg)
    physics = physics_penalty(
        candidate, current, operating_windows, power_restricted, predicted_ttt, current_ttt
    )
    historical = historical_similarity_penalty(candidate, hist_index)
    total = predicted_ttt + industrial + physics + historical
    return ScoreBreakdown(
        predicted_ttt=predicted_ttt,
        industrial_penalty=industrial,
        physics_penalty=physics,
        historical_penalty=historical,
        total_score=total,
        improvement_min=current_ttt - predicted_ttt,
    )


INDUSTRIAL_REASONS: dict[str, dict[str, str]] = {
    "HM": {
        "up": "Higher HM slightly reduces electrical burden while maintaining charge balance.",
        "down": "Slightly lower HM shifts burden toward DRI while keeping total charge stable.",
        "flat": "HM maintained to preserve established liquid metal practice.",
    },
    "DRI": {
        "up": "Higher DRI supports melting when HM is reduced, preserving metallic input.",
        "down": "Lower DRI compensates for HM increase to maintain burden balance.",
        "flat": "DRI maintained for stable virgin burden practice.",
    },
    "HBI": {
        "up": "Moderate HBI addition diversifies metallic charge within safe limits.",
        "down": "Slight HBI reduction simplifies burden handling.",
        "flat": "HBI unchanged; optional material held steady.",
    },
    "Bucket": {
        "up": "Moderate scrap increase within operator-adjustable limits.",
        "down": "Scrap reduced slightly to favour structured metallic burden.",
        "flat": "Scrap charge maintained.",
    },
    "LIME": {
        "up": "Minor lime increase for slag basicity control.",
        "down": "Minor slag optimization via slight lime reduction.",
        "flat": "Lime held steady for stable slag practice.",
    },
    "DOLO": {
        "up": "Minor dolomite adjustment for refractory protection.",
        "down": "Slight dolomite reduction within normal flux practice.",
        "flat": "Dolomite maintained.",
    },
    "CPC": {
        "up": "Slight carbon increase to support foaming and chemistry.",
        "down": "Minor carbon reduction within safe injection limits.",
        "flat": "Carbon injection practice unchanged.",
    },
    "POWER": {
        "up": "Higher electrical energy accelerates melting.",
        "down": "Power held near current level; large reductions slow melting.",
        "flat": "Power level maintained.",
        "restricted": "Power not increased due to active power restriction.",
    },
    "OXY": {
        "up": "Higher oxygen supports faster refining.",
        "down": "Minor oxygen trim within acceptable refining window.",
        "flat": "Oxygen practice maintained.",
    },
}


def physics_status_for_var(
    var: str,
    current: dict[str, Any],
    recommended: dict[str, Any],
    operating_windows: pd.DataFrame,
    power_restricted: bool,
) -> str:
    cur = float(current[var])
    rec = float(recommended[var])
    delta = rec - cur

    if var == "POWER":
        if power_restricted and delta > 1.0:
            return "Physics X (restriction)"
        if not power_restricted and delta < -cur * POWER_REDUCTION_EXEMPT_PCT:
            return "Physics X (lower power slows melting)"
        if delta > 0:
            return "Physics OK"
        if abs(delta) <= cur * POWER_REDUCTION_EXEMPT_PCT:
            return "Physics OK"
        return "Physics X"

    if var == "OXY":
        if within_historical(operating_windows, "OXY", cur) and not power_restricted:
            if delta < -cur * OXY_REDUCTION_EXEMPT_PCT:
                return "Physics X (oxygen reduction)"
            if delta >= 0:
                return "Physics OK"
            return "Physics OK"
        return "Physics OK"

    if var in {"HM", "DRI"}:
        hm_d = recommended["HM"] - current["HM"]
        dri_d = recommended["DRI"] - current["DRI"]
        if hm_d * dri_d > 0 and abs(hm_d) > HM_DRI_MIN_MOVE_T and abs(dri_d) > HM_DRI_MIN_MOVE_T:
            return "Physics X (HM/DRI coupling)"
        return "Physics OK"

    if var in {"LIME", "DOLO"}:
        if flux_ratio_change(current, recommended) > FLUX_RATIO_MAX_CHANGE:
            return "Physics X (flux ratio)"
        return "Physics OK"

    if var == "CPC":
        if rel_change(cur, rec) > CPC_MAX_CHANGE:
            return "Physics X (large CPC change)"
        return "Physics OK"

    return "Physics OK"


def explain_recommendation(
    var: str,
    current: float,
    recommended: float,
    power_restricted: bool,
) -> str:
    delta = recommended - current
    if var == "POWER" and power_restricted and delta > 0.05:
        return INDUSTRIAL_REASONS["POWER"]["restricted"]
    if abs(delta) < (0.05 if var not in {"POWER", "OXY"} else 5):
        key = "flat"
    elif delta > 0:
        key = "up"
    else:
        key = "down"
    return INDUSTRIAL_REASONS.get(var, {}).get(key, "Adjustment within local operating window.")


def generate_local_candidate(
    current: dict[str, Any],
    original_charge: float,
    rng: np.random.Generator,
    cfg: AdjustmentConfig,
) -> dict[str, Any]:
    shift = normalize_shift(current["Shift"])

    hm_pct = rng.uniform(-cfg.hm_pct, cfg.hm_pct)
    hm_lo = float(current["HM"] * (1.0 - cfg.hm_pct))
    hm_hi = float(current["HM"] * (1.0 + cfg.hm_pct))
    hm_new = float(np.clip(current["HM"] * (1.0 + hm_pct), hm_lo, hm_hi))

    hbi_new = float(np.clip(current["HBI"] + rng.uniform(-cfg.hbi_abs_t, cfg.hbi_abs_t), 0.0, None))
    bucket_new = float(np.clip(current["Bucket"] + rng.uniform(-cfg.bucket_abs_t, cfg.bucket_abs_t), 0.0, None))

    dri_new = float(max(0.0, original_charge - hm_new - hbi_new - bucket_new))

    dri_noise_pct = rng.uniform(-cfg.dri_pct * 0.25, cfg.dri_pct * 0.25)
    dri_trial = float(max(0.0, dri_new * (1.0 + dri_noise_pct)))
    hm_comp = float(np.clip(hm_new + (dri_new - dri_trial), hm_lo, hm_hi))
    dri_trial = float(max(0.0, original_charge - hm_comp - hbi_new - bucket_new))
    hm_new = hm_comp
    dri_new = dri_trial

    recipe: dict[str, Any] = {
        "HM": hm_new,
        "DRI": dri_new,
        "HBI": hbi_new,
        "Bucket": bucket_new,
        "Shift": shift,
    }

    for var, pct in [("LIME", cfg.lime_pct), ("DOLO", cfg.dolo_pct), ("CPC", cfg.cpc_pct)]:
        delta = rng.uniform(-pct, pct)
        recipe[var] = float(max(0.0, current[var] * (1.0 + delta)))

    power_delta = rng.uniform(-cfg.power_pct, cfg.power_pct)
    recipe["POWER"] = float(max(0.0, current["POWER"] * (1.0 + power_delta)))

    oxy_delta = rng.uniform(-cfg.oxy_pct, cfg.oxy_pct)
    recipe["OXY"] = float(max(0.0, current["OXY"] * (1.0 + oxy_delta)))

    return recipe


@dataclass
class PhysicsGuidedRecipeOptimizer:
    model: Any
    preprocessor: Any
    feature_names: list[str]
    operating_windows: pd.DataFrame
    hist_index: HistoricalSimilarityIndex
    config: AdjustmentConfig = field(default_factory=AdjustmentConfig)
    random_state: int = RANDOM_STATE

    def predict_ttt(self, recipes: pd.DataFrame) -> np.ndarray:
        X = engineer_recipe_features(recipes)[self.feature_names]
        X_arr = self.preprocessor.transform(X.to_numpy())
        return self.model.predict(X_arr)

    def generate_and_validate(
        self,
        current: dict[str, Any],
        power_restricted: bool,
    ) -> tuple[pd.DataFrame, Counter, int]:
        cfg = self.config
        rng = np.random.default_rng(self.random_state)
        original_charge = total_charge(current)
        rejections: Counter = Counter()
        accepted_rows: list[dict[str, Any]] = []

        for _ in tqdm(range(cfg.n_generate), desc="Generating candidates"):
            candidate = generate_local_candidate(current, original_charge, rng, cfg)
            result = validate_candidate(
                candidate,
                current,
                original_charge,
                power_restricted,
                self.operating_windows,
                self.hist_index,
                cfg,
            )
            if result.accepted:
                accepted_rows.append(candidate)
            else:
                rejections[result.reason] += 1

        return pd.DataFrame(accepted_rows), rejections, cfg.n_generate

    def optimize(
        self,
        current_recipe: dict[str, Any],
        power_restriction: int = 0,
    ) -> dict[str, Any]:
        current = {**current_recipe, "Shift": normalize_shift(current_recipe["Shift"])}
        power_restricted = bool(power_restriction)
        original_charge = total_charge(current)
        current_ttt = float(self.predict_ttt(pd.DataFrame([current]))[0])

        candidates, rejections, generated = self.generate_and_validate(current, power_restricted)

        if candidates.empty:
            raise RuntimeError("No valid local candidates generated. Relax constraints or check current recipe.")

        candidates["Predicted_TTT"] = self.predict_ttt(candidates)

        industrial_list: list[float] = []
        physics_list: list[float] = []
        historical_list: list[float] = []
        score_list: list[float] = []
        charge_devs: list[float] = []
        hist_dists: list[float] = []

        for _, row in candidates.iterrows():
            rec = row.to_dict()
            pred = float(row["Predicted_TTT"])
            breakdown = score_candidate(
                rec,
                current,
                original_charge,
                self.operating_windows,
                self.hist_index,
                power_restricted,
                pred,
                current_ttt,
                self.config,
            )
            industrial_list.append(breakdown.industrial_penalty)
            physics_list.append(breakdown.physics_penalty)
            historical_list.append(breakdown.historical_penalty)
            score_list.append(breakdown.total_score)
            charge_devs.append(abs(total_charge(rec) - original_charge))
            hist_dists.append(self.hist_index.nearest_distance(rec))

        candidates["Industrial_Penalty"] = industrial_list
        candidates["Physics_Penalty"] = physics_list
        candidates["Historical_Penalty"] = historical_list
        candidates["Score"] = score_list
        candidates["Charge_Deviation_t"] = charge_devs
        candidates["Hist_Distance"] = hist_dists
        candidates["Improvement_min"] = current_ttt - candidates["Predicted_TTT"]

        ranked = candidates.sort_values("Score").reset_index(drop=True)
        top5 = ranked.head(5)
        best = top5.iloc[0]

        diagnostics = {
            "generated": generated,
            "accepted": len(candidates),
            "rejected": generated - len(candidates),
            "rejections": rejections,
            "avg_hm_adj": float((candidates["HM"] - current["HM"]).mean()),
            "avg_dri_adj": float((candidates["DRI"] - current["DRI"]).mean()),
            "avg_power_adj": float((candidates["POWER"] - current["POWER"]).mean()),
            "avg_oxy_adj": float((candidates["OXY"] - current["OXY"]).mean()),
            "avg_charge_dev": float(candidates["Charge_Deviation_t"].mean()),
            "max_physics_penalty": float(candidates["Physics_Penalty"].max()),
            "avg_physics_penalty": float(candidates["Physics_Penalty"].mean()),
            "best_score": float(best["Score"]),
            "original_charge_t": original_charge,
            "hist_extreme_threshold": self.hist_index.extreme_threshold,
        }

        best_rec = best.to_dict()
        physics_compliant = all(
            physics_status_for_var(v, current, best_rec, self.operating_windows, power_restricted).endswith("OK")
            for v in ["HM", "DRI", "POWER", "OXY", "LIME", "DOLO", "CPC"]
        )

        return {
            "current_recipe": current,
            "current_ttt": current_ttt,
            "top5": top5,
            "best_recipe": best,
            "best_ttt": float(best["Predicted_TTT"]),
            "best_industrial_penalty": float(best["Industrial_Penalty"]),
            "best_physics_penalty": float(best["Physics_Penalty"]),
            "best_historical_penalty": float(best["Historical_Penalty"]),
            "best_score": float(best["Score"]),
            "improvement_min": current_ttt - float(best["Predicted_TTT"]),
            "best_hist_distance": float(best["Hist_Distance"]),
            "best_charge_dev": float(best["Charge_Deviation_t"]),
            "physics_compliant": physics_compliant,
            "power_restriction": power_restriction,
            "diagnostics": diagnostics,
        }


def load_historical_data() -> pd.DataFrame:
    df = pd.read_csv(PHASE16_DATASET)
    for col in CONTROLLABLE_NUMERIC:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["Shift"] = df["Shift"].map(normalize_shift)
    df["Total_Charge"] = df[BURDEN_COLS].sum(axis=1)
    return df.dropna(subset=CONTROLLABLE_NUMERIC)


def load_cleaned_recipes() -> pd.DataFrame:
    path = CLEANED_DATASET if CLEANED_DATASET.exists() else PHASE16_DATASET
    df = pd.read_csv(path)
    for col in CONTROLLABLE_NUMERIC:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.dropna(subset=CONTROLLABLE_NUMERIC)


def compute_operating_windows(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for col in CONTROLLABLE_NUMERIC:
        s = df[col].dropna()
        rows.append(
            [
                col,
                float(s.min()),
                float(s.quantile(0.05)),
                float(s.median()),
                float(s.quantile(0.95)),
                float(s.max()),
                float(s.mean()),
                float(s.std()),
            ]
        )
    return pd.DataFrame(
        rows, columns=["Variable", "Min", "P5", "Median", "P95", "Max", "Mean", "Std"]
    ).set_index("Variable")


def default_current_recipe(df: pd.DataFrame) -> dict[str, Any]:
    work = df.copy()
    work["Total_Charge"] = work[BURDEN_COLS].sum(axis=1)
    in_band = work[(work["Total_Charge"] >= CHARGE_MIN_T) & (work["Total_Charge"] <= CHARGE_MAX_T)]
    pool = in_band if not in_band.empty else work
    row = pool.iloc[(pool["Total_Charge"] - 120.0).abs().argmin()]
    recipe = {col: float(row[col]) for col in CONTROLLABLE_NUMERIC}
    recipe["Shift"] = normalize_shift(row["Shift"])
    return recipe


def print_candidate_summary(diag: dict[str, Any]) -> None:
    section("CANDIDATE GENERATION SUMMARY")
    print(f"Generated:               {diag['generated']}")
    print(f"Accepted:                {diag['accepted']}")
    print(f"Rejected:                {diag['rejected']}")
    print(f"Original total charge:   {diag['original_charge_t']:.2f} t")

    section("REJECTION REASONS")
    rows = [[reason, count] for reason, count in diag["rejections"].most_common()]
    if rows:
        print_table(rows, ["Reason", "Count"])
    else:
        print("No rejections recorded.")


def print_diagnostics(diag: dict[str, Any], result: dict[str, Any]) -> None:
    section("OPTIMIZATION DIAGNOSTICS")
    rows = [
        ["Average HM adjustment (t)", diag["avg_hm_adj"]],
        ["Average DRI adjustment (t)", diag["avg_dri_adj"]],
        ["Average POWER adjustment", diag["avg_power_adj"]],
        ["Average OXY adjustment", diag["avg_oxy_adj"]],
        ["Average charge deviation (t)", diag["avg_charge_dev"]],
        ["Maximum physics penalty", diag["max_physics_penalty"]],
        ["Average physics penalty", diag["avg_physics_penalty"]],
        ["Best feasible score", diag["best_score"]],
        ["Current predicted TTT (min)", result["current_ttt"]],
        ["Best feasible predicted TTT (min)", result["best_ttt"]],
        ["Expected improvement (min)", result["improvement_min"]],
    ]
    print_table(rows, ["Metric", "Value"])


def print_top5_table(top5: pd.DataFrame) -> None:
    section("TOP 5 FEASIBLE RECIPES (Score = TTT + Industrial + Physics + Historical)")
    cols = [
        "HM", "DRI", "POWER", "OXY", "Predicted_TTT",
        "Industrial_Penalty", "Physics_Penalty", "Historical_Penalty", "Score", "Improvement_min",
    ]
    print_table(top5[cols].round(3).values.tolist(), cols)


def print_recommendation_report(
    current: dict[str, Any],
    best: pd.Series,
    operating_windows: pd.DataFrame,
    power_restricted: bool,
) -> None:
    section("INDUSTRIAL RECOMMENDATIONS (BEST FEASIBLE RECIPE)")
    best_rec = best.to_dict()
    rows = []
    for var in ["HM", "DRI", "HBI", "Bucket", "POWER", "OXY", "LIME", "DOLO", "CPC"]:
        cur = float(current[var])
        rec = float(best[var])
        delta = rec - cur
        reason = explain_recommendation(var, cur, rec, power_restricted)
        status = physics_status_for_var(var, current, best_rec, operating_windows, power_restricted)
        rows.append([var, f"{cur:.2f}", f"{rec:.2f}", f"{delta:+.2f}", reason, status])
    print_table(rows, ["Variable", "Current", "Recommended", "Change", "Reason", "Physics Status"])
    print(f"\nShift: {current['Shift']} (fixed, not optimized)")


def print_best_explanation(result: dict[str, Any]) -> None:
    section("BEST RECIPE EXPLANATION")
    rows = [
        ["Prediction improvement (min)", result["improvement_min"]],
        ["Industrial penalty", result["best_industrial_penalty"]],
        ["Physics penalty", result["best_physics_penalty"]],
        ["Historical similarity penalty", result["best_historical_penalty"]],
        ["Total score", result["best_score"]],
        ["Charge difference (t)", result["best_charge_dev"]],
        ["Historical NN distance", result["best_hist_distance"]],
        ["Physics compliance", "YES" if result["physics_compliant"] else "NO"],
    ]
    print_table(rows, ["Item", "Value"])

    print("\nScore breakdown (best recipe):")
    print(f"  Predicted TTT:        {result['best_ttt']:.2f}")
    print(f"  Industrial Penalty:   {result['best_industrial_penalty']:.2f}")
    print(f"  Physics Penalty:      {result['best_physics_penalty']:.2f}")
    print(f"  Historical Penalty:   {result['best_historical_penalty']:.2f}")
    print(f"  Final Score:          {result['best_score']:.2f}")


def save_outputs(optimizer: PhysicsGuidedRecipeOptimizer, result: dict[str, Any]) -> None:
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(optimizer, EXPORTS_DIR / "recipe_optimizer.pkl")

    top5_records = []
    for i, row in result["top5"].iterrows():
        top5_records.append(
            {
                "rank": int(i) + 1,
                "recipe": {col: float(row[col]) if col != "Shift" else row[col] for col in OPERATOR_COLS},
                "predicted_ttt": float(row["Predicted_TTT"]),
                "industrial_penalty": float(row["Industrial_Penalty"]),
                "physics_penalty": float(row["Physics_Penalty"]),
                "historical_penalty": float(row["Historical_Penalty"]),
                "score": float(row["Score"]),
            }
        )

    best = result["best_recipe"]
    payload = {
        "phase": "20.2",
        "strategy": "physics_guided_local_search",
        "current_recipe": result["current_recipe"],
        "optimized_recipe": {col: float(best[col]) if col != "Shift" else best[col] for col in OPERATOR_COLS},
        "top5_feasible": top5_records,
        "current_predicted_ttt_min": result["current_ttt"],
        "best_feasible_predicted_ttt_min": result["best_ttt"],
        "best_industrial_penalty": result["best_industrial_penalty"],
        "best_physics_penalty": result["best_physics_penalty"],
        "best_historical_penalty": result["best_historical_penalty"],
        "best_feasible_score": result["best_score"],
        "expected_improvement_min": result["improvement_min"],
        "physics_compliant": result["physics_compliant"],
        "power_restriction": result["power_restriction"],
    }
    with open(EXPORTS_DIR / "optimized_recipe.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def parse_cli() -> tuple[dict[str, Any] | None, int, AdjustmentConfig]:
    import argparse

    parser = argparse.ArgumentParser(description="Phase 20.2 Physics-Guided Recipe Optimizer")
    parser.add_argument("--hm", type=float)
    parser.add_argument("--dri", type=float)
    parser.add_argument("--hbi", type=float)
    parser.add_argument("--bucket", type=float)
    parser.add_argument("--lime", type=float)
    parser.add_argument("--dolo", type=float)
    parser.add_argument("--cpc", type=float)
    parser.add_argument("--power", type=float)
    parser.add_argument("--oxy", type=float)
    parser.add_argument("--shift", type=str)
    parser.add_argument("--power-restriction", type=int, choices=[0, 1], default=0)
    parser.add_argument("--n-generate", type=int, default=1000)
    args = parser.parse_args()

    cfg = AdjustmentConfig(n_generate=args.n_generate)
    overrides: dict[str, Any] = {}
    argmap = {
        "hm": "HM", "dri": "DRI", "hbi": "HBI", "bucket": "Bucket",
        "lime": "LIME", "dolo": "DOLO", "cpc": "CPC", "power": "POWER", "oxy": "OXY", "shift": "Shift",
    }
    for arg, col in argmap.items():
        val = getattr(args, arg)
        if val is not None:
            overrides[col] = normalize_shift(val) if col == "Shift" else float(val)

    return (overrides if overrides else None), int(args.power_restriction), cfg


def main() -> None:
    section("PHASE 20.2 - PHYSICS-GUIDED INDUSTRIAL RECIPE OPTIMIZER")
    np.random.seed(RANDOM_STATE)

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Production model not found: {MODEL_PATH}")

    model = joblib.load(MODEL_PATH)
    preprocessor = joblib.load(PREPROC_PATH)
    df = load_historical_data()
    cleaned = load_cleaned_recipes()
    windows = compute_operating_windows(df)
    hist_index = HistoricalSimilarityIndex.from_dataframe(cleaned)

    section("HISTORICAL OPERATING WINDOWS (reference)")
    print_table(
        windows.reset_index().values.tolist(),
        ["Variable", "Min", "P5", "Median", "P95", "Max", "Mean", "Std"],
    )

    cli_overrides, power_restriction, cfg = parse_cli()

    section("LOCAL ADJUSTMENT LIMITS (configurable)")
    print_table(
        [
            ["HM", f"+/-{cfg.hm_pct*100:.0f}%"],
            ["DRI", f"+/-{cfg.dri_pct*100:.0f}% (coupled inversely to HM)"],
            ["HBI", f"+/-{cfg.hbi_abs_t:.0f} t"],
            ["Bucket", f"+/-{cfg.bucket_abs_t:.0f} t"],
            ["LIME/DOLO/CPC", f"+/-{cfg.lime_pct*100:.0f}%"],
            ["POWER/OXY", f"+/-{cfg.power_pct*100:.0f}%"],
            ["Charge tolerance", f"+/-{cfg.charge_tolerance_t:.0f} t"],
            ["Total charge band", f"{CHARGE_MIN_T:.0f}-{CHARGE_MAX_T:.0f} t"],
            ["Candidates to generate", str(cfg.n_generate)],
            ["Historical dataset", str(CLEANED_DATASET if CLEANED_DATASET.exists() else PHASE16_DATASET)],
            ["Historical NN threshold", f"{hist_index.extreme_threshold:.3f}"],
        ],
        ["Rule", "Value"],
    )

    current_recipe = default_current_recipe(df)
    if cli_overrides:
        current_recipe.update(cli_overrides)

    optimizer = PhysicsGuidedRecipeOptimizer(
        model=model,
        preprocessor=preprocessor,
        feature_names=MODEL_FEATURES,
        operating_windows=windows,
        hist_index=hist_index,
        config=cfg,
    )

    section("CURRENT RECIPE")
    charge = sum(current_recipe[c] for c in BURDEN_COLS)
    rows = [[col, current_recipe[col]] for col in OPERATOR_COLS]
    rows.append(["Total Charge (t)", charge])
    rows.append(["POWER_RESTRICTION", power_restriction])
    print_table(rows, ["Item", "Value"])

    result = optimizer.optimize(current_recipe, power_restriction=power_restriction)

    print_candidate_summary(result["diagnostics"])
    print_diagnostics(result["diagnostics"], result)
    print_top5_table(result["top5"])
    print_recommendation_report(
        result["current_recipe"],
        result["best_recipe"],
        windows,
        bool(power_restriction),
    )
    print_best_explanation(result)

    save_outputs(optimizer, result)

    section("PHASE 20.2 COMPLETE")
    elapsed = time.perf_counter() - PIPELINE_START
    print(f"Exports: {EXPORTS_DIR / 'recipe_optimizer.pkl'}")
    print(f"         {EXPORTS_DIR / 'optimized_recipe.json'}")
    print(f"Runtime: {elapsed:.2f} seconds")
    print("\nCommand:")
    print("python research/phase_20_recipe_optimizer/recipe_optimizer.py")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
