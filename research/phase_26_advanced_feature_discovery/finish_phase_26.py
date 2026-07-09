"""Resume Phase 26 from Step 7 using saved feature_ranking.csv."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

PHASE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE_ROOT))

from phase_26_pipeline import (
    CANDIDATE_META,
    NORMAL_MAX,
    RAW_PATH,
    classify_features,
    engineer_advanced,
    feature_columns,
    publication_plots,
    rebuild_models,
    scientific_catalog,
    tree_pipe,
    write_reports,
)
from lightgbm import LGBMRegressor
from sklearn.model_selection import train_test_split


def main():
    print("Rebuild engineered frame...")
    raw = pd.read_csv(RAW_PATH)
    full = engineer_advanced(raw)
    df = full[full["TTT"] <= NORMAL_MAX].copy().reset_index(drop=True)
    feats = feature_columns(df)
    p24_feats = [c for c in feats if c not in CANDIDATE_META]

    rank = pd.read_csv(PHASE_ROOT / "feature_ranking.csv")
    print(rank.head(8)[["Feature", "Robustness", "Is_new"]].to_string(index=False))

    print("STEP 7...")
    gold, silver, experimental = classify_features(rank)
    print(f"Gold={len(gold)} Silver={len(silver)} Exp={len(experimental)}")

    print("STEP 8...")
    comp, vs, best_pipe, best_feats, best_name = rebuild_models(
        df, p24_feats, gold["Feature"].tolist(), silver["Feature"].tolist()
    )
    print(vs.to_string(index=False))
    print("Best:", best_name)

    # Fallback pipe for plots if needed
    if best_pipe is None:
        use = gold["Feature"].tolist()
        Xtr, Xte, ytr, yte = train_test_split(df[use], df["TTT"], test_size=0.2, random_state=42)
        best_pipe = tree_pipe(LGBMRegressor(n_estimators=300, max_depth=7, learning_rate=0.05, random_state=42, verbose=-1, n_jobs=1))
        best_pipe.fit(Xtr, ytr)
        best_feats = use

    print("STEP 9–10...")
    catalog = scientific_catalog(df, rank, gold, silver, experimental)
    regimes = pd.read_csv(PHASE_ROOT / "operating_regimes.csv")
    best_k = 3
    if "Silhouette_K" in regimes.columns and regimes["Silhouette_K"].notna().any():
        best_k = int(regimes["Silhouette_K"].dropna().iloc[0])
    publication_plots(df, best_feats, best_pipe, rank)
    write_reports(catalog, rank, gold, silver, regimes, vs, best_k, len(CANDIDATE_META))
    print("DONE")


if __name__ == "__main__":
    main()
