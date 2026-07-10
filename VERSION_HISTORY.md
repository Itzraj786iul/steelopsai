# Version History — JSPL EAF Industrial AI

| Version | Date | Phase | Summary |
|---------|------|-------|---------|
| **1.0.0-rc** | 2026-07-10 | 38 | Release Candidate — QA, stabilization, demo readiness. No ML/backend changes. |
| 0.37.0 | 2026-07-09 | 37 | Enterprise readiness — audit, explainability, validation center, session backup |
| 0.36.0 | 2026-07-08 | 36 | Shift operations dashboard, heat queue, daily export |
| 0.35.0 | 2026-07-07 | 35 | Production UX — sticky heat panel, lifecycle workflow |
| 0.34.0 | 2026-07-06 | 34 | Current Heat workspace integration |
| 0.33.0 | 2026-07-05 | 33 | FastAPI integration — validation, feedback, reliability, deployment readiness |
| 0.32.0 | 2026-06 | 32 | Hybrid trust framework (Reliability Index, consensus) |
| 0.31.0 | 2026-06 | 31 | Optimizer V2 — planning-safe, research mode |
| 0.29.0 | 2026-06 | 29 | Explainability layer (SHAP, similar heats) |
| 0.21.0 | 2026-05 | 21 | Streamlit prototype application |
| 0.20.2 | 2026-05 | 20.2 | Physics-guided recipe optimizer (**frozen production**) |
| 0.19.0 | 2026-04 | 19 | Stacking regressor production model (**frozen production**) |
| 0.16–0.18 | 2026 | 16–18 | Feature engineering, leakage audit, model development |

---

## Frozen production components (v1.0.0)

| Component | Phase | Artifact location |
|-----------|-------|-------------------|
| Prediction model | 19 | `research/phase_19_model_development/exports/` |
| Optimizer | 20.2 | `research/phase_20_recipe_optimizer/exports/` |
| Optimizer V2 | 31 | `research/phase_31_optimizer_v2/` |
| Hybrid engine | 32 | `research/phase_32_hybrid_engine/` |
| API integration | 33 | `backend/app/services/` |

---

## Version registry (runtime)

```json
{
  "frontend": "1.0.0",
  "backend": "1.0.0",
  "model_phase": "Phase 19",
  "optimizer_phase": "Phase 20.2",
  "research_phases": "16–37"
}
```

Source: `GET /version` · UI: `/eaf/versions`

---

## Git tags

| Tag | Description |
|-----|-------------|
| `v1.0.0` | Release Candidate tag (local — not pushed automatically) |
