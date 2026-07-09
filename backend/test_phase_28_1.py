"""Quick verification for Phase 28.1 advisory validation."""

from __future__ import annotations

from app.services.ml_service import predict_recipe

CASES = [
    ("80t", {"HM": 40, "DRI": 40}),
    ("95t", {"HM": 48, "DRI": 47}),
    ("120t", {"HM": 56.8, "DRI": 63.2}),
    ("131t", {"HM": 65, "DRI": 66}),
    ("140t", {"HM": 70, "DRI": 70}),
    ("145t", {"HM": 72, "DRI": 73}),
]

BASE = {
    "HBI": 0,
    "Bucket": 0,
    "LIME": 9.9,
    "DOLO": 2.5,
    "CPC": 576,
    "POWER": 29985,
    "OXY": 3911,
    "Shift": "B",
    "Power_Restriction": 0,
}


def main() -> None:
    for label, partial in CASES:
        recipe = {**BASE, **partial}
        charge = partial["HM"] + partial["DRI"]
        result = predict_recipe(recipe)
        print(
            f"{label} charge={charge:.1f}t "
            f"ttt={result['predicted_ttt']:.2f} "
            f"conf={result['confidence']} "
            f"class={result['charge_classification']} "
            f"warnings={len(result['validation_warnings'])}"
        )


if __name__ == "__main__":
    main()
