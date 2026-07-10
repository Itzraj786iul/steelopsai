# Heat Management System — Implementation Report

**Date:** 2026-07-10  
**Scope:** Production HeatRecord database wrapping the existing JSPL EAF AI platform  
**Constraint:** No changes to Phase 19 / 20.2 / 31 / 32 ML engines, pickles, feature engineering, or prediction algorithms

---

## 1. Database schema

**Engine:** SQLite (stdlib `sqlite3`)  
**Path:** `backend/data/heat_history/heats.db` (gitignored)  
**Module:** `backend/app/services/heat_db.py`

### Table `heat_records`

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| heat_number | TEXT | Indexed |
| date / time | TEXT | ISO date + HH:MM:SS |
| shift | TEXT | A / B / C |
| status | TEXT | Draft → … → Archived |
| operator_name / operator_id | TEXT | Optional |
| recipe_json | TEXT | Full recipe snapshot |
| hm, dri, hbi, bucket, lime, dolo, cpc, oxy | REAL | Flattened recipe |
| electrical_energy_kwh | REAL | From POWER |
| target_oxygen_program / target_carbon_program | REAL | Optional |
| power_restriction | INTEGER | 0/1 |
| predicted_ttt, prediction_interval_low/high | REAL | Prediction |
| confidence, historical_similarity, risk_level | TEXT/REAL | |
| optimized_recipe_json, optimized_ttt, expected_saving | | Phase 20.2 |
| v2_recipe_json, v2_ttt, v2_saving | | Phase 31 |
| reliability_index, physics/industrial/ai_confidence, consensus | | Phase 32 |
| actual_ttt, prediction_error | REAL | Validation |
| optimizer_result_json, actual_recipe_json | TEXT | |
| recommendation_status | TEXT | Accepted / Modified / Rejected |
| operator_comments | TEXT | |
| explainability_json | TEXT | |
| session_id | TEXT | Links to frontend Current Heat |
| created_at / updated_at | TEXT | UTC ISO |

**Deduplication:** Upsert by `session_id` (preferred) or active `heat_number` (non-Archived). Same heat evolves in place — no duplicate rows per active session.

**Lifecycle:** Draft → Predicted → Optimized → Accepted → Running → Completed → Validated → Archived

---

## 2. APIs added

Router: `backend/app/routers/heat_history.py` (prefix `/heats`)  
Service: `backend/app/services/heat_history_service.py`  
Schemas: `backend/app/schemas/heat_record.py`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/heats/from-prediction` | Auto-save after predict |
| POST | `/heats/from-optimizer` | Update after optimize / V2 / accept |
| POST | `/heats/from-validation` | Update after actual TTT |
| GET | `/heats` | List + search + filter + pagination |
| GET | `/heats/{id}` | Get by UUID |
| GET | `/heats/by-number/{heat_number}` | Get by heat number |
| PATCH | `/heats/{id}/status` | Set lifecycle status |
| POST | `/heats/{id}/archive` | Archive |
| GET | `/heats/dashboard` | Shift dashboard aggregates |
| GET | `/heats/analytics` | Plant analytics |
| GET | `/heats/reports/daily` | Day report |
| GET | `/heats/reports/weekly` | Week report |
| GET | `/heats/reports/monthly` | Month report |
| GET | `/heats/validation-metrics` | MAE / RMSE / Bias from DB |
| POST | `/heats/export` | CSV / Excel / JSON / PDF |

**Unchanged:** `POST /predict`, `POST /optimize`, `POST /optimize/v2`, `POST /hybrid/evaluate`, and all prior ML endpoints.

---

## 3. Automatic save wiring

Frontend sync helper: `src/lib/heat-history-sync.ts`

| Trigger | Hook |
|---------|------|
| Successful prediction | `useEafPredict` → `syncHeatAfterPrediction()` |
| Successful optimize / V2 | `useEafOptimize` / `useEafOptimizeV2` → `syncHeatAfterOptimizer()` |
| Recommendation accept/modify/reject | `current-heat-store.setRecommendationAcceptance` |
| Validation submit | `current-heat-store.updateValidation` → `syncHeatAfterValidation()` |

No Save button required. Failures are silent (non-blocking) so ML workflows never break if DB is unavailable.

---

## 4. Frontend pages

| Route | Component |
|-------|-----------|
| `/eaf/heat-history` | Production table — search, filter, sort, pagination, export |
| `/eaf/heats/[heat_number]` | Full heat details — recipe, prediction, optimizer, hybrid, validation, lifecycle |
| `/eaf/shift-dashboard` | KPI cards, pie charts, trend lines, plant analytics |

**Navigation:** Production → Heat History, Shift Dashboard

**Dashboard:** Shows “Production Database (Today)” strip from HeatRecord DB  
**Reports:** Daily production report + DB export (CSV/Excel/JSON/PDF)

---

## 5. Exports

| Format | Endpoint | Notes |
|--------|----------|-------|
| CSV | `POST /heats/export` | Spreadsheet-ready |
| Excel | same | openpyxl (added to requirements) |
| JSON | same | Full nested records |
| PDF | same | Landscape summary (reportlab) |

Filters: period, shift, status, search query, selected IDs.

---

## 6. Verification

| Check | Result |
|-------|--------|
| HeatRecord CRUD (Python) | PASS — predict → optimize → validate lifecycle |
| API `GET /heats` | PASS |
| API `GET /heats/dashboard` | PASS |
| API `GET /heats/by-number/...` | PASS |
| TypeScript | PASS |
| ESLint | PASS |
| Production build | (running / see below) |
| Existing ML endpoints | Untouched |
| Duplicate prevention | Upsert by session_id / heat_number |

---

## 7. Migration guide

1. Pull latest code.
2. Backend: `pip install -r backend/requirements.txt` (adds `openpyxl`).
3. Start API — DB auto-creates on startup at `backend/data/heat_history/heats.db`.
4. Frontend: no env changes; uses existing `NEXT_PUBLIC_EAF_API_URL`.
5. Run any prediction — first HeatRecord appears automatically.
6. Open **Heat History** and **Shift Dashboard** in Production nav.

**Rollback:** Remove heat_history router include from `main.py`; delete `backend/data/heat_history/`. ML stack unaffected.

---

## 8. Screenshots

Capture after demo:

1. Heat History table with filters  
2. Heat Details page for one heat  
3. Shift Dashboard KPIs + charts  
4. Dashboard “Production Database (Today)” strip  
5. Reports daily DB export buttons  

---

## 9. Known notes

- Operator name/id fields exist in schema; UI can be extended in Settings later.
- Target Oxygen/Carbon Program columns exist for future MES fields.
- Current Heat (localStorage) remains for live operator workflow; DB is the permanent store.
- Session history (max 20) is unchanged as a local cache.

---

*Heat Management wraps production AI — it does not replace or retrain it.*
