# first line: 496
@MEMORY.cache
def _fit_reduced_importance(X_arr: np.ndarray, y_arr: np.ndarray, feature_names: tuple[str, ...]) -> pd.DataFrame:
    features = list(feature_names)
    X = pd.DataFrame(X_arr, columns=features)
    y = pd.Series(y_arr)

    rf = RandomForestRegressor(
        n_estimators=200, max_depth=14, min_samples_leaf=2, n_jobs=-1, random_state=RANDOM_SEED
    )
    lgbm = lgb.LGBMRegressor(
        n_estimators=200, learning_rate=0.05, num_leaves=31, random_state=RANDOM_SEED, verbosity=-1, n_jobs=-1
    )
    rf.fit(X, y)
    lgbm.fit(X, y)

    mi_vals = []
    for col in features:
        pair = pd.concat([X[col], y], axis=1).dropna()
        if len(pair) >= 3 and pair.iloc[:, 0].nunique() > 1:
            mi_vals.append(float(mutual_info_regression(pair.iloc[:, [0]], pair.iloc[:, 1], random_state=RANDOM_SEED)[0]))
        else:
            mi_vals.append(math.nan)

    sample_idx = np.random.default_rng(RANDOM_SEED).choice(len(X), size=min(SHAP_SAMPLE_SIZE, len(X)), replace=False)
    X_sample = X.iloc[sample_idx]
    explainer = shap.TreeExplainer(lgbm)
    shap_vals = explainer.shap_values(X_sample)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[0]
    shap_imp = np.abs(shap_vals).mean(axis=0)

    perm = permutation_importance(rf, X, y, n_repeats=PERMUTATION_REPEATS, random_state=RANDOM_SEED, n_jobs=-1)

    return pd.DataFrame(
        {
            "Feature": features,
            "Pearson": [float(X[c].corr(y)) for c in features],
            "Mutual Information": mi_vals,
            "Random Forest importance": rf.feature_importances_,
            "LightGBM importance": lgbm.feature_importances_,
            "SHAP importance": shap_imp,
            "Permutation importance": perm.importances_mean,
        }
    )
