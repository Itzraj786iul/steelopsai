# Phase 26 — Scientific Findings

## Scope
Leakage-free feature discovery on **normal heats (TTT ≤ 60)** from existing JSPL columns only.
No production models modified. Scientific rigor prioritized over MAE chasing.

## Discovery summary
- Candidate physically motivated variables registered: **35**
- Gold tier: **7** (5 newly discovered + 2 Phase-24 anchors: `BUCKET_X_CPC`, `HM_X_OXY_NORM`)
- Silver: **4** | Experimental: **4**
- Highest-robustness new feature: **LOG_OXYGEN** (0.987), followed by **LOG_SOLID_BURDEN**, **SCRAP_CARBON_OXYGEN**

## Metallurgical interpretation of top new gold features

| Feature | Formula | Meaning |
|---------|---------|---------|
| LOG_OXYGEN | ln(1+OXY) | Nonlinear oxygen response (diminishing returns) |
| LOG_SOLID_BURDEN | ln(1+SOLID) | Nonlinear solid melt load |
| SCRAP_CARBON_OXYGEN | Bucket·CPC·OXY / TC² | Scrap foam pathway intensity |
| RECIPE_MAHALANOBIS_L2 | ‖z(recipe)‖₂ | Distance from median plant practice |
| SOLID_BURDEN_COMPACTNESS | SOLID² / TC | Quadratic solid burden intensity |

Additional candidate families (entropy, basicity proxy, foam proxy, regime flags) are catalogued in `candidate_features.csv` / `feature_catalog.xlsx`; several remain Silver/Experimental after robustness filters.

## Model impact

| Split | Phase 25 | Phase 26 best | Δ MAE |
|-------|----------|---------------|------:|
| Random | 3.283 | **3.243** (Gold+P24 / CatBoost) | **−0.040** |
| Temporal | 3.640 | **3.595** (Gold-only / CatBoost) | **−0.045** |

**Interpretation:** Small, consistent gains. Remixing the same raw variables into better metallurgical forms helps slightly, but does **not** unlock sub-3.0 MAE. The information ceiling from Phase 24.5/25 is confirmed.

## Operating regimes
- KMeans silhouette-optimal **k = 2** (sil ≈ 0.38)
- Oversize charge (>130 t): TTT mean **+3.5 min** vs global
- High scrap: **+1.8 min**
- High HM / High DRI: **−1.2 to −1.3 min**
- Low oxygen (P25): **−1.9 min** mean TTT on *normal* cohort (selection/practice effect — interpret cautiously)

Specialized models are justified for **high-scrap** and **oversize-charge** paths; not for fine cluster fragmentation.

## Causal structure
Partial correlation + MI (`causal_network.csv`, `bayesian_dependencies.csv`) support relatively **direct** links of TTT to oxygen/solid nonlinear forms and scrap–C–O pathway; many ratio features appear **indirect** via solid burden / slag load.

## Controllability
Operators can influence gold recipe features (O₂, CPC, scrap, HM–DRI mix). `RECIPE_MAHALANOBIS_L2` is a **diagnostic** of atypical practice, not a free setpoint.

## Limitations
Derived features cannot invent delay codes, metallization, or power-on minutes. UMAP/Boruta packages were unavailable; t-SNE + PCA + hierarchical + GMM + shadow-Boruta were used instead.
