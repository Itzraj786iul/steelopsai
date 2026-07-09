"""TTT prediction using the frozen Phase 19 production model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import joblib
import numpy as np
import pandas as pd

from config import (
    CI_HALF_WIDTH_95,
    FEATURE_DISPLAY_NAMES,
    FEATURE_IMPORTANCE_PATH,
    MODEL_PATH,
    PREPROC_PATH,
    TEST_MAE_MIN,
    TOP_CONTRIBUTOR_FEATURES,
)
from feature_engineering import MODEL_FEATURES, engineer_recipe_features, recipe_to_dataframe


@dataclass
class PredictionResult:
    predicted_ttt: float
    margin: float
    ci_lower_95: float
    ci_upper_95: float
    contributions: pd.DataFrame
    top_contributors: pd.DataFrame


class PredictionEngine:
    def __init__(self) -> None:
        self.model = joblib.load(MODEL_PATH)
        self.preprocessor = joblib.load(PREPROC_PATH)
        self.global_importance = pd.read_csv(FEATURE_IMPORTANCE_PATH)
        self.baseline_features = self._load_baseline_features()

    def _load_baseline_features(self) -> pd.Series:
        from config import PHASE16_DATASET, CONTROLLABLE_NUMERIC
        from feature_engineering import normalize_shift

        df = pd.read_csv(PHASE16_DATASET)
        for col in CONTROLLABLE_NUMERIC:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        df["Shift"] = df["Shift"].map(normalize_shift)
        med = df[CONTROLLABLE_NUMERIC + ["Shift"]].median(numeric_only=True)
        med["Shift"] = df["Shift"].mode().iloc[0]
        return engineer_recipe_features(recipe_to_dataframe(med.to_dict())).iloc[0]

    def _predict_from_features(self, features: pd.DataFrame) -> float:
        X = features[MODEL_FEATURES].to_numpy()
        X_proc = self.preprocessor.transform(X)
        return float(self.model.predict(X_proc)[0])

    def predict(self, recipe: dict[str, Any]) -> float:
        feats = engineer_recipe_features(recipe_to_dataframe(recipe))
        return self._predict_from_features(feats)

    def predict_with_interval(self, recipe: dict[str, Any]) -> PredictionResult:
        pred = self.predict(recipe)
        margin = TEST_MAE_MIN
        ci_lower = pred - CI_HALF_WIDTH_95
        ci_upper = pred + CI_HALF_WIDTH_95
        contribs = self.feature_contributions(recipe)
        top = contribs.head(5).copy()
        top["display_name"] = top["feature"].map(
            lambda f: FEATURE_DISPLAY_NAMES.get(f, f.replace("_", " "))
        )
        return PredictionResult(
            predicted_ttt=pred,
            margin=margin,
            ci_lower_95=ci_lower,
            ci_upper_95=ci_upper,
            contributions=contribs,
            top_contributors=top,
        )

    def feature_contributions(self, recipe: dict[str, Any]) -> pd.DataFrame:
        """Ablation-based attribution (fast SHAP fallback for StackingRegressor)."""
        current_feats = engineer_recipe_features(recipe_to_dataframe(recipe)).iloc[0]
        base_pred = self._predict_from_features(current_feats.to_frame().T)

        rows: list[dict[str, Any]] = []
        for feat in MODEL_FEATURES:
            modified = current_feats.copy()
            modified[feat] = self.baseline_features[feat]
            mod_pred = self._predict_from_features(modified.to_frame().T)
            rows.append(
                {
                    "feature": feat,
                    "value": float(current_feats[feat]),
                    "contribution": float(base_pred - mod_pred),
                    "abs_contribution": float(abs(base_pred - mod_pred)),
                }
            )

        df = pd.DataFrame(rows).sort_values("abs_contribution", ascending=False)
        imp_map = self.global_importance.set_index("Feature")["Mean_ABS_SHAP"].to_dict()
        df["global_importance"] = df["feature"].map(imp_map).fillna(0.0)
        return df.reset_index(drop=True)

    def batch_predict(self, recipes: list[dict[str, Any]]) -> np.ndarray:
        frame = pd.concat([recipe_to_dataframe(r) for r in recipes], ignore_index=True)
        feats = engineer_recipe_features(frame)
        X = self.preprocessor.transform(feats[MODEL_FEATURES].to_numpy())
        return self.model.predict(X)
    