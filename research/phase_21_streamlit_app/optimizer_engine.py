"""Wrapper around the frozen Phase 20.2 physics-guided recipe optimizer."""

from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import Any

import pandas as pd

from config import PHASE20_ROOT


def _ensure_phase20_path() -> None:
    phase20 = str(PHASE20_ROOT)
    if phase20 not in sys.path:
        sys.path.insert(0, phase20)


@dataclass
class OptimizationResult:
    current_recipe: dict[str, Any]
    optimized_recipe: dict[str, Any]
    current_ttt: float
    optimized_ttt: float
    improvement_min: float
    top5: pd.DataFrame
    best_industrial_penalty: float
    best_physics_penalty: float
    best_historical_penalty: float
    best_score: float
    physics_compliant: bool
    diagnostics: dict[str, Any]
    power_restriction: int


class OptimizerEngine:
    def __init__(self) -> None:
        _ensure_phase20_path()
        from recipe_optimizer import (  # noqa: WPS433
            AdjustmentConfig,
            HistoricalSimilarityIndex,
            PhysicsGuidedRecipeOptimizer,
            compute_operating_windows,
            explain_recommendation,
            load_cleaned_recipes,
            load_historical_data,
            physics_status_for_var,
        )

        self._AdjustmentConfig = AdjustmentConfig
        self._HistoricalSimilarityIndex = HistoricalSimilarityIndex
        self._PhysicsGuidedRecipeOptimizer = PhysicsGuidedRecipeOptimizer
        self._compute_operating_windows = compute_operating_windows
        self._explain_recommendation = explain_recommendation
        self._load_cleaned_recipes = load_cleaned_recipes
        self._load_historical_data = load_historical_data
        self._physics_status_for_var = physics_status_for_var

        import joblib
        from config import MODEL_PATH, PREPROC_PATH
        from feature_engineering import MODEL_FEATURES

        model = joblib.load(MODEL_PATH)
        preprocessor = joblib.load(PREPROC_PATH)
        df = self._load_historical_data()
        cleaned = self._load_cleaned_recipes()
        windows = self._compute_operating_windows(df)
        hist_index = self._HistoricalSimilarityIndex.from_dataframe(cleaned)

        self.operating_windows = windows
        self.optimizer = self._PhysicsGuidedRecipeOptimizer(
            model=model,
            preprocessor=preprocessor,
            feature_names=MODEL_FEATURES,
            operating_windows=windows,
            hist_index=hist_index,
            config=AdjustmentConfig(n_generate=1000),
        )

    def optimize(
        self,
        current_recipe: dict[str, Any],
        power_restriction: int = 0,
        n_generate: int = 1000,
    ) -> OptimizationResult:
        self.optimizer.config.n_generate = n_generate
        raw = self.optimizer.optimize(current_recipe, power_restriction=power_restriction)
        best = raw["best_recipe"]
        from feature_engineering import OPERATOR_COLS

        opt_recipe = {
            col: float(best[col]) if col != "Shift" else str(best[col])
            for col in OPERATOR_COLS
        }

        return OptimizationResult(
            current_recipe=raw["current_recipe"],
            optimized_recipe=opt_recipe,
            current_ttt=float(raw["current_ttt"]),
            optimized_ttt=float(raw["best_ttt"]),
            improvement_min=float(raw["improvement_min"]),
            top5=raw["top5"],
            best_industrial_penalty=float(raw["best_industrial_penalty"]),
            best_physics_penalty=float(raw["best_physics_penalty"]),
            best_historical_penalty=float(raw["best_historical_penalty"]),
            best_score=float(raw["best_score"]),
            physics_compliant=bool(raw["physics_compliant"]),
            diagnostics=raw["diagnostics"],
            power_restriction=int(power_restriction),
        )

    def explain_change(self, var: str, current: float, recommended: float, power_restricted: bool) -> str:
        return self._explain_recommendation(var, current, recommended, power_restricted)

    def physics_status(self, var: str, current: dict, recommended: dict, power_restricted: bool) -> str:
        return self._physics_status_for_var(var, current, recommended, self.operating_windows, power_restricted)
