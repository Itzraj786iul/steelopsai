# first line: 331
@MEMORY.cache
def run_optuna(model_name: str, X_train_arr: np.ndarray, y_train_arr: np.ndarray, scale: bool) -> dict[str, Any]:
    cv = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)

    def objective(trial: optuna.Trial) -> float:
        params = optuna_search_space(trial, model_name)
        est = build_estimator(model_name, params)
        pipe = make_pipeline(est, scale)
        return cv_mae(pipe, X_train_arr, y_train_arr, cv)[0]

    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=RANDOM_STATE))
    study.optimize(objective, n_trials=OPTUNA_TRIALS, show_progress_bar=False)
    return {"best_params": study.best_params, "best_cv_mae": float(study.best_value)}
