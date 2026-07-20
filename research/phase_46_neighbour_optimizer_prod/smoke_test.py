"""Phase 46 smoke — similar heats, neighbour CI, POWER freeze."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import DEFAULT_RECIPE
from app.services.ml_service import optimize_recipe, predict_recipe


def main() -> None:
    recipe = dict(DEFAULT_RECIPE)
    pred = predict_recipe(recipe)
    sims = pred["explainability"]["similar_heats"]
    assert len(sims) >= 1
    assert "recipe_deltas" in sims[0]
    assert "recipe_similarity_pct" in sims[0]
    assert pred["explainability"].get("neighbor_benchmark") is not None
    assert "ci_half_width" in pred

    opt = optimize_recipe(recipe, n_generate=150)
    assert abs(float(opt["optimized_recipe"]["POWER"]) - float(recipe["POWER"])) < 1e-6
    print("OK phase46 smoke")
    print(
        f"pred={pred['predicted_ttt']:.2f} best_heat={sims[0]['heat_id']} "
        f"sim={sims[0]['similarity_pct']}% power_frozen=True "
        f"imp={opt['improvement_min']:.2f}"
    )


if __name__ == "__main__":
    main()
