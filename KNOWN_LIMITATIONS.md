# Known Limitations — v1.0.0 Release Candidate

**Product:** JSPL EAF Tap-to-Tap Industrial AI Decision Support Platform  
**Version:** 1.0.0  
**Phase:** 38 (final development phase)

These limitations are **documented by design**, not defects. Phase 38 did not modify frozen ML/backend layers.

---

## 1. Data & Industrial Coverage

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Training data from historical JSPL heats (fixed snapshot) | Predictions outside 80–145 t charge range carry higher uncertainty | Advisory warnings shown; validation workflow for plant feedback |
| Actual TTT for live heats requires manual entry or future MES sync | Validation metrics depend on operator input | Validation page + Validation Center |
| Missing SCADA variables (Phase 27 gap analysis) | Digital twin readiness score capped | Digital Twin Readiness page documents sensor roadmap |
| Shift/grade coverage may not represent all operating regimes | Confidence may read "Medium" or "Low" on outliers | Hybrid trust framework + explainability |

---

## 2. Machine Learning (Frozen — No Retraining)

| Limitation | Detail |
|------------|--------|
| Phase 19 model frozen | No online learning; feedback stored for research only |
| Phase 20.2 optimizer frozen | Physics-guided local search; not a global plant optimizer |
| Phase 31 V2 research mode | Does not optimize POWER by design |
| Phase 32 hybrid | Adds trust metrics; does not replace production prediction |
| No ensemble retraining pipeline in production | Retraining requires offline research phases |

---

## 3. Frontend & Session

| Limitation | Detail |
|------------|--------|
| Audit trails in localStorage | Cleared if browser data wiped; use Session Backup export |
| Plant configuration in localStorage | Not synced across devices without backup import |
| Performance metrics client-side only | Not persisted to backend telemetry |
| Auth is demonstration-grade | Production pilot needs SSO/plant IAM integration |

---

## 4. Performance

| Limitation | Typical value |
|------------|---------------|
| ML warmup on cold backend start | 10–15 s |
| Hybrid evaluation | 15–25 s (runs prediction + optimizer + rules) |
| Optimizer V2 | 5–8 s |
| Dashboard charts | Largest frontend bundle (351 kB First Load JS) |

---

## 5. Deployment

| Limitation | Detail |
|------------|--------|
| Backend requires ML artifact files on disk | Render/cloud deploy needs artifact bundle |
| CORS configured for known frontend origins | New domains need env update |
| PDF report generation | Server-side; depends on backend availability |

---

## 6. Out of Scope for v1.0

- Real-time SCADA/MES integration
- Multi-furnace fleet orchestration
- Automatic model retraining from operator feedback
- Phase 39+ feature development (intentionally frozen after Phase 38)

---

## Recommended Post-Release Focus

1. Validate against additional real JSPL heats (predicted vs actual TTT)
2. Collect guide and plant engineer feedback during demonstrations
3. Fix only defects or usability issues discovered in the field
4. Prepare thesis, internship report, and publication using `release/` assets
