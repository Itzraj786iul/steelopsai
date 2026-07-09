# Hybrid Decision Engine (Phase 32)

## Purpose

Combines physics confidence, AI confidence, industrial rules, historical similarity, and cross-source agreement into a single **Reliability Index** and **Consensus** label.

## API

`POST /hybrid/evaluate` — optional `heat_id` for traceability.

## Metrics exposed in UI

| Metric | Range | Source module |
|--------|-------|---------------|
| Reliability Index | 0–100 | `reliability_engine.py` |
| AI Confidence | 0–100 | `confidence_engine.py` |
| Physics Confidence | 0–100 | `confidence_engine.py` |
| Industrial Confidence | 0–100 | `confidence_engine.py` |
| Historical Similarity | % | Phase 31 ranked recommendation |
| Recommendation Stability | 0–100 | Phase 31 V2 |
| Consensus | Strong / Moderate / Weak / Conflict | `recommendation_consensus.py` |

## Integration rule

Phase 33 loads the engine via `research_bridge_service.py` without editing `hybrid_decision_engine.py`.

## Prediction page

Phase 32 trust framework **replaces** the legacy single-tier confidence card. Core `/predict` inference is unchanged.
