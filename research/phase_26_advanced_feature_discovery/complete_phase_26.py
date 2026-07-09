"""Resume Phase 26 from Step 6 (feature ranking) onward."""

from __future__ import annotations

import sys
from pathlib import Path

PHASE_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(PHASE_ROOT))

import pandas as pd
from phase_26_pipeline import (
    CANDIDATE_META,
    RAW_PATH,
    classify_features,
    engineer_advanced,
    feature_columns,
    feature_ranking,
    publication_plots,
    rebuild_models,
    scientific_catalog,
    write_reports,
    NORMAL_MAX,
)


def main():
    print("Rebuild engineered frame...")
    raw = pd.read_csv(RAW_PATH)
    full = engineer_advanced(raw)
    df = full[full["TTT"] <= NORMAL_MAX].copy().reset_index(drop=True)
    feats = feature_columns(df)
    p24_feats = [c for c in feats if c not in CANDIDATE_META]
    print(f"Normal={len(df)} feats={len(feats)} new={len(CANDIDATE_META)}")

    print("STEP 6 Feature ranking...")
    rank, base_pipe = feature_ranking(df, feats)
    print(rank.head(10)[["Feature", "Robustness", "Is_new"]].to_string(index=False))

    print("STEP 7 Selection...")
    gold, silver, experimental = classify_features(rank)
    print(f"Gold={len(gold)} Silver={len(silver)} Exp={len(experimental)}")

    print("STEP 8 Models...")
    comp, vs, best_pipe, best_feats, best_name = rebuild_models(
        df, p24_feats, gold["Feature"].tolist(), silver["Feature"].tolist()
    )
    print(vs.to_string(index=False))
    print("Best:", best_name)

    print("STEP 9 Catalog...")
    catalog = scientific_catalog(df, rank, gold, silver, experimental)

    print("STEP 10 Reports/plots...")
    regimes = pd.read_csv(PHASE_ROOT / "operating_regimes.csv")
    best_k = int(regimes["Silhouette_K"].dropna().iloc[0]) if "Silhouette_K" in regimes.columns and regimes["Silhouette_K"].notna().any() else 3
    publication_plots(df, best_feats or gold["Feature"].tolist(), best_pipe or base_pipe, rank)
    write_reports(catalog, rank, gold, silver, regimes, vs, best_k, len(CANDIDATE_META))
    print("DONE")


if __name__ == "__main__":
    main()
