"""
Release 1.0 — verification suite.
Tests all API endpoints and prediction/optimizer consistency without modifying ML artifacts.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from fastapi.testclient import TestClient  # noqa: E402
from app.core.config import APP_VERSION, DEFAULT_RECIPE  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)
RESULTS: list[dict] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    RESULTS.append({"check": name, "pass": ok, "detail": detail})
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name}" + (f" — {detail}" if detail else ""))


def main() -> int:
    print(f"JSPL EAF Release 1.0 Verification (v{APP_VERSION})\n")

    # Health & version
    r = client.get("/health")
    check("GET /health", r.status_code == 200, f"status={r.status_code}")
    health = r.json()
    check("Health model_loaded", health.get("model_loaded") is True)
    check("Health version 1.0.0", health.get("version") == "1.0.0", str(health.get("version")))

    r = client.get("/version")
    check("GET /version", r.status_code == 200)
    ver = r.json()
    check("Version registry backend", ver.get("backend_version") == "1.0.0")
    check("Version model Phase 19", ver.get("model_phase") == "Phase 19")
    check("Version optimizer Phase 20.2", ver.get("optimizer_phase") == "Phase 20.2")

    r = client.get("/model-info")
    check("GET /model-info", r.status_code == 200)
    info = r.json()
    check("Model has 22 features", info.get("n_features") == 22)

    recipe = dict(DEFAULT_RECIPE)

    # Prediction consistency
    r = client.post("/predict", json=recipe)
    check("POST /predict", r.status_code == 200, f"status={r.status_code}")
    pred = r.json()
    ttt = pred.get("predicted_ttt", 0)
    check("Prediction TTT in range", 35 <= ttt <= 45, f"TTT={ttt:.2f} min (default recipe)")
    check("Prediction has CI", pred.get("ci_lower_95") < pred.get("ci_upper_95"))
    check("Prediction explainability present", "explainability" in pred and pred["explainability"] is not None)

    # Optimizer consistency
    r = client.post("/optimize", json={**recipe, "n_generate": 200})
    check("POST /optimize", r.status_code == 200)
    opt = r.json()
    check("Optimizer improvement >= 0", opt.get("improvement_min", -1) >= 0, f"saving={opt.get('improvement_min')}")
    check("Optimizer optimized <= current", opt.get("optimized_ttt", 999) <= opt.get("current_ttt", 0) + 0.01)
    check("Optimizer comparison rows", len(opt.get("comparison", [])) > 0)

    # Optimizer V2
    r = client.post("/optimize/v2", json=recipe)
    check("POST /optimize/v2", r.status_code == 200)
    v2 = r.json()
    check("V2 power_optimized false", v2.get("power_optimized") is False)
    check("V2 recommendations top5", len(v2.get("recommendations", [])) >= 1)
    v2_power_unchanged = abs(v2["optimized_recipe"].get("POWER", 0) - recipe["POWER"]) < 0.01
    check("V2 POWER unchanged", v2_power_unchanged)

    # Hybrid
    r = client.post("/hybrid/evaluate", json=recipe)
    check("POST /hybrid/evaluate", r.status_code == 200)
    hybrid = r.json()
    check("Hybrid reliability 0-100", 0 <= hybrid.get("reliability_index", -1) <= 100)
    check("Hybrid consensus present", hybrid.get("consensus") in {"Strong", "Moderate", "Weak", "Conflict", "strong", "moderate", "weak", "conflict"} or bool(hybrid.get("consensus")))

    # Other endpoints
    r = client.post("/whatif", json=recipe)
    check("POST /whatif", r.status_code == 200)

    r = client.get("/historical")
    check("GET /historical", r.status_code == 200)

    r = client.post("/historical", json=recipe)
    check("POST /historical", r.status_code == 200)

    r = client.get("/historical/statistics")
    check("GET /historical/statistics", r.status_code == 200)

    r = client.post("/process-health", json=recipe)
    check("POST /process-health", r.status_code == 200)

    r = client.get("/report?format=json")
    check("GET /report", r.status_code == 200)

    r = client.post("/report", json={"recipe": recipe, "format": "json", "include_optimization": True})
    check("POST /report", r.status_code == 200)

    r = client.get("/validation")
    check("GET /validation", r.status_code == 200)

    r = client.get("/feedback")
    check("GET /feedback", r.status_code == 200)

    r = client.get("/feedback/summary")
    check("GET /feedback/summary", r.status_code == 200)

    r = client.get("/reliability/summary")
    check("GET /reliability/summary", r.status_code == 200)

    r = client.get("/deployment/readiness")
    check("GET /deployment/readiness", r.status_code == 200)

    # Frontend pages manifest
    pages_file = ROOT / "release" / "frontend_pages.json"
    expected_pages = [
        "/eaf/dashboard", "/eaf/prediction", "/eaf/optimizer", "/eaf/validation",
        "/eaf/reliability", "/eaf/feedback", "/eaf/deployment-readiness",
        "/eaf/whatif", "/eaf/historical", "/eaf/health", "/eaf/model",
        "/eaf/reports", "/eaf/settings", "/eaf/about", "/eaf/research",
    ]
    fe_root = ROOT / "steelops-ai" / "frontend_v2" / "src" / "app" / "(platform)" / "eaf"
    for page in expected_pages:
        rel = page.replace("/eaf/", "").replace("/eaf", "dashboard")
        page_path = fe_root / rel / "page.tsx" if rel != "dashboard" else fe_root / "dashboard" / "page.tsx"
        if page == "/eaf/dashboard":
            page_path = fe_root / "dashboard" / "page.tsx"
        elif page == "/eaf/research":
            page_path = fe_root / "research" / "page.tsx"
        else:
            page_path = fe_root / rel / "page.tsx"
        check(f"Frontend page {page}", page_path.exists(), str(page_path))

    passed = sum(1 for x in RESULTS if x["pass"])
    total = len(RESULTS)
    print(f"\n{passed}/{total} checks passed")

    out = ROOT / "release" / "verification_results.json"
    out.write_text(json.dumps({"version": APP_VERSION, "passed": passed, "total": total, "checks": RESULTS}, indent=2), encoding="utf-8")
    return 0 if passed == total else 1


if __name__ == "__main__":
    raise SystemExit(main())
