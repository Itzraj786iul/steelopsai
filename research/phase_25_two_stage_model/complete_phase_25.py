"""
Phase 25 completion script — reuses Stage 1 classifier results if present,
then runs Stages 2–8 quickly with fixed hyperparameters.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

PHASE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE_ROOT))

from phase_25_pipeline import (
    PLOTS,
    RANDOM_STATE,
    assign_regime,
    delay_root_cause,
    industrial_features,
    lf_features,
    load_lf_data,
    pipeline_simulation,
    stage1_classifiers,
    temporal_split,
    train_regime_regressions,
    write_reports,
    clf_pipe,
    classifier_models,
)

def refit_best_classifier(df, feats, schema, model_name):
    labels = {
        "4class_standard": ["NORMAL", "LONG", "DELAY", "SHUTDOWN"],
        "3class_phase16": ["NORMAL", "DELAY", "SHUTDOWN"],
        "2class_normal_vs_abnormal": ["NORMAL", "ABNORMAL"],
        "2class_delay_detection": ["NORMAL", "DELAY"],
    }[schema]
    work = df.copy()
    work["Regime"] = assign_regime(work["TTT"], schema)
    tr, te = temporal_split(work)
    le = LabelEncoder()
    le.fit(labels)
    pipe = clf_pipe(classifier_models(len(labels))[model_name])
    pipe.fit(tr[feats], le.transform(tr["Regime"]))
    return pipe, le, labels


def pick_best_from_csv(comp: pd.DataFrame):
    # Prefer binary normal vs abnormal; else highest Macro_F1
    binary = comp[comp["Schema"] == "2class_normal_vs_abnormal"].copy()
    if not binary.empty:
        # Balance Macro_F1 and abnormal recall
        binary["Score"] = binary["Macro_F1"] + 0.1 * binary.get("Recall_ABNORMAL", 0).fillna(0)
        row = binary.sort_values("Score", ascending=False).iloc[0]
        return row["Schema"], row["Model"]
    row = comp.sort_values("Macro_F1", ascending=False).iloc[0]
    return row["Schema"], row["Model"]


def main():
    print("Loading data...")
    df = load_lf_data()
    feats = lf_features(df)
    PLOTS.mkdir(parents=True, exist_ok=True)

    clf_path = PHASE_ROOT / "classifier_comparison.csv"
    if clf_path.exists():
        print("Reusing Stage 1 classifier results...")
        comp = pd.read_csv(clf_path)
        best_schema, best_model = pick_best_from_csv(comp)
        print(f"Selected: {best_model} / {best_schema}")
        best_clf, best_le, best_labels = refit_best_classifier(df, feats, best_schema, best_model)
    else:
        print("STAGE 1 — Classifiers...")
        best_schema, best_model, best_clf, best_labels, best_le, comp = stage1_classifiers(df, feats)

    print("STAGE 2–4 — Regime regressions...")
    best_reg, normal_rows, delay_rows = train_regime_regressions(df, feats)

    print("STEP 5 — Delay root causes...")
    delay_root_cause(df)

    print("STEP 6 — Industrial features...")
    ind_df = industrial_features()

    print("STEP 7 — Pipeline simulation...")
    pipe_row = pipeline_simulation(df, feats, best_clf, best_le, best_reg, best_schema, best_labels)

    print("STEP 8 — Reports...")
    write_reports(comp, normal_rows, pipe_row, ind_df, best_schema, best_model)

    print("DONE —", PHASE_ROOT)


if __name__ == "__main__":
    main()
