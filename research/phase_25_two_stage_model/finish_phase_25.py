"""Finish Phase 25 Steps 5–8 using already-trained Stage 2 models and Stage 1 results."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

PHASE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE_ROOT))

from phase_25_pipeline import (
    PLOTS,
    RANDOM_STATE,
    assign_regime,
    classifier_models,
    clf_pipe,
    delay_root_cause,
    industrial_features,
    lf_features,
    load_lf_data,
    pipeline_simulation,
    temporal_split,
    write_reports,
)


def main():
    print("Loading...")
    df = load_lf_data()
    feats = lf_features(df)
    PLOTS.mkdir(parents=True, exist_ok=True)

    # Refit best classifier (LightGBM binary)
    schema, model_name = "2class_normal_vs_abnormal", "LightGBM"
    labels = ["NORMAL", "ABNORMAL"]
    work = df.copy()
    work["Regime"] = assign_regime(work["TTT"], schema)
    tr, te = temporal_split(work)
    le = LabelEncoder()
    le.fit(labels)
    best_clf = clf_pipe(classifier_models(2)[model_name])
    best_clf.fit(tr[feats], le.transform(tr["Regime"]))

    # Refit best normal regressor (CatBoost temporal winner; LightGBM also fine)
    from catboost import CatBoostRegressor
    normal = df[df["TTT"] <= 60].copy()
    trn, ten = temporal_split(normal)
    best_reg = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("model", CatBoostRegressor(iterations=500, depth=8, learning_rate=0.05, random_seed=RANDOM_STATE, verbose=0)),
    ])
    best_reg.fit(trn[feats], trn["TTT"])

    print("STEP 5...")
    delay_root_cause(df)

    print("STEP 6...")
    ind_df = industrial_features()

    print("STEP 7...")
    pipe_row = pipeline_simulation(df, feats, best_clf, le, best_reg, schema, labels)

    print("STEP 8...")
    comp = pd.read_csv(PHASE_ROOT / "classifier_comparison.csv")
    normal_rows = pd.read_csv(PHASE_ROOT / "normal_regression_results.csv").to_dict("records")
    write_reports(comp, normal_rows, pipe_row, ind_df, schema, model_name)

    print("DONE")


if __name__ == "__main__":
    main()
