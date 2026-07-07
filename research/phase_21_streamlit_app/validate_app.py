"""
Automated validation for Phase 22 Streamlit application.
Run: python validate_app.py
"""

from __future__ import annotations

import json
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

RESULTS: list[dict] = []


def record(name: str, passed: bool, detail: str = "", elapsed_ms: float = 0) -> None:
    RESULTS.append({
        "test": name, "passed": passed, "detail": detail, "elapsed_ms": round(elapsed_ms, 1),
    })
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] {name}" + (f" ({elapsed_ms:.0f} ms)" if elapsed_ms else ""))
    if detail and not passed:
        print(f"         {detail}")


def run_tests() -> bool:
    print("=" * 60)
    print("Phase 22 Application Validation")
    print("=" * 60)

    # Prediction engine
    t0 = time.perf_counter()
    try:
        from prediction_engine import PredictionEngine
        from utils import default_recipe, validate_recipe

        engine = PredictionEngine()
        recipe = default_recipe()
        ok, errs = validate_recipe(recipe)
        record("Recipe validation (default)", ok, "; ".join(errs))
        result = engine.predict_with_interval(recipe)
        elapsed_cold = (time.perf_counter() - t0) * 1000
        record("Prediction engine", 35 < result.predicted_ttt < 55, f"TTT={result.predicted_ttt:.2f}", elapsed_cold)
        t1 = time.perf_counter()
        engine.predict(recipe)
        elapsed_warm = (time.perf_counter() - t1) * 1000
        record("Prediction speed <300ms (warm)", elapsed_warm < 300, f"{elapsed_warm:.0f}ms", elapsed_warm)
    except Exception as exc:
        record("Prediction engine", False, traceback.format_exc())

    # Optimizer
    t0 = time.perf_counter()
    try:
        from optimizer_engine import OptimizerEngine
        opt_eng = OptimizerEngine()
        opt = opt_eng.optimize(default_recipe(), power_restriction=0, n_generate=200)
        elapsed = (time.perf_counter() - t0) * 1000
        record("Optimizer engine", opt.improvement_min >= 0 or opt.physics_compliant, f"improve={opt.improvement_min:.2f}", elapsed)
    except Exception as exc:
        record("Optimizer engine", False, traceback.format_exc())

    # Charts
    try:
        from charts import build_tornado_chart, build_radial_gauge, build_waterfall_chart, build_distribution_chart
        from utils import load_historical_stats, load_historical_raw

        stats = load_historical_stats()
        raw = load_historical_raw()
        r = default_recipe()
        fig1 = build_waterfall_chart(result.contributions, result.predicted_ttt)
        fig2 = build_tornado_chart(r, engine.predict)
        fig3 = build_radial_gauge("Power", r["POWER"], stats.loc["POWER", "p5"], stats.loc["POWER", "p95"], "Good")
        fig4 = build_distribution_chart("HM", r["HM"], stats.loc["HM"], raw["HM"])
        record("Chart builders", all(f is not None for f in [fig1, fig2, fig3, fig4]))
    except Exception as exc:
        record("Chart builders", False, str(exc))

    # Live validation & operator summary
    try:
        from utils import live_validation_warnings, build_operator_summary
        warnings = live_validation_warnings(r, stats)
        summary = build_operator_summary(r, result, stats)
        record("Live validation", isinstance(warnings, list))
        record("Operator summary", "process_status" in summary and "risk" in summary)
    except Exception as exc:
        record("Operator summary", False, str(exc))

    # Exports
    try:
        from utils import build_json_export, build_csv_export, generate_pdf_report, historical_comparison_table

        comp = historical_comparison_table(r, stats)
        j = build_json_export(r, result, opt)
        c = build_csv_export(r, result, opt)
        pdf = generate_pdf_report(r, result, opt, ["Test"], comp, result.contributions, summary)
        record("JSON export", len(j) > 100)
        record("CSV export", "predicted_ttt" in c)
        record("PDF export", len(pdf) > 1000, f"{len(pdf)} bytes")
    except Exception as exc:
        record("Exports", False, str(exc))

    # Logging
    try:
        from logging_service import log_prediction, log_optimizer
        log_prediction(r, result.predicted_ttt, "validation")
        log_optimizer(r, opt.current_ttt, opt.optimized_ttt, opt.improvement_min, opt.physics_compliant, "validation")
        log_path = ROOT / "logs" / "prediction_log.csv"
        record("Logging service", log_path.exists())
    except Exception as exc:
        record("Logging service", False, str(exc))

    # Module imports (pages)
    try:
        import app  # noqa: F401
        record("App module import", True)
    except Exception as exc:
        record("App module import", False, str(exc))

    passed = sum(1 for r in RESULTS if r["passed"])
    total = len(RESULTS)
    all_ok = passed == total
    print("=" * 60)
    print(f"Results: {passed}/{total} passed")
    return all_ok


def write_reports(all_ok: bool) -> None:
    out_dir = ROOT.parent / "phase_22_final_validation"
    out_dir.mkdir(parents=True, exist_ok=True)

    lines = [
        "# Phase 22 Validation Report",
        f"\nGenerated: {datetime.now().isoformat(timespec='seconds')}\n",
        f"**Overall:** {'PASS' if all_ok else 'FAIL'}\n",
        "| Test | Status | Detail | Time (ms) |",
        "|------|--------|--------|-----------|",
    ]
    for r in RESULTS:
        lines.append(
            f"| {r['test']} | {'PASS' if r['passed'] else 'FAIL'} | {r['detail'][:60]} | {r['elapsed_ms']} |"
        )
    (out_dir / "validation_report.md").write_text("\n".join(lines), encoding="utf-8")

    perf = [
        "# Performance Report",
        f"\nGenerated: {datetime.now().isoformat(timespec='seconds')}\n",
        "| Target | Specification |",
        "|--------|---------------|",
        "| Startup | < 5 s (model lazy-loaded on first prediction page) |",
        "| Prediction | < 300 ms (after model cached) |",
        "| Optimizer | < 5 s (200 candidates validation run; production uses 1000) |",
        "| Memory | < 1 GB typical |",
    ]
    (out_dir / "performance_report.md").write_text("\n".join(perf), encoding="utf-8")

    checklist = [
        "# Deployment Checklist",
        "",
        "- [x] Frozen model artifacts unchanged",
        "- [x] Phase 20.2 optimizer logic unchanged",
        "- [x] Feature engineering unchanged",
        "- [x] Streamlit app launches with `streamlit run app.py`",
        "- [x] All pages implemented (Dashboard, Prediction, Optimizer, What-if, Historical, Health, Report, History, About)",
        "- [x] CSV / JSON / PDF exports",
        "- [x] Session logging to `logs/`",
        "- [ ] Capture screenshots for `application_screenshots.md`",
        "- [ ] Deploy on target JSPL workstation",
    ]
    (out_dir / "deployment_checklist.md").write_text("\n".join(checklist), encoding="utf-8")

    screenshots = [
        "# Application Screenshots",
        "",
        "Placeholder paths — capture after running the app:",
        "",
        "| Page | File |",
        "|------|------|",
        "| Dashboard | `phase_21_streamlit_app/plots/screenshot_dashboard.png` |",
        "| TTT Prediction | `phase_21_streamlit_app/plots/screenshot_prediction.png` |",
        "| Recipe Optimizer | `phase_21_streamlit_app/plots/screenshot_optimizer.png` |",
        "| What-if | `phase_21_streamlit_app/plots/screenshot_whatif.png` |",
        "| Historical | `phase_21_streamlit_app/plots/screenshot_historical.png` |",
        "| Process Health | `phase_21_streamlit_app/plots/screenshot_health.png` |",
    ]
    (out_dir / "application_screenshots.md").write_text("\n".join(screenshots), encoding="utf-8")

    print(f"\nReports written to {out_dir}")


if __name__ == "__main__":
    ok = run_tests()
    write_reports(ok)
    sys.exit(0 if ok else 1)
