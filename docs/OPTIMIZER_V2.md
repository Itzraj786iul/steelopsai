# Optimizer V2 (Phase 31)

## Purpose

Planning-safe recipe optimization that **never adjusts POWER (EE_KWH)**. Suitable for shift planning before heat start.

## API

`POST /optimize/v2` — body identical to `/predict` recipe fields.

## Response highlights

- `recommendations[]` — top 5 ranked candidates
- `power_optimized: false` — always
- Per recommendation: `physics_score`, `industrial_score`, `historical_similarity_pct`, `explanation`

## Comparison with Phase 20.2

| Aspect | Phase 20.2 | Phase 31 V2 |
|--------|------------|-------------|
| POWER | May suggest changes | Never optimized |
| Use case | Production default | Research / planning |
| Endpoint | `/optimize` | `/optimize/v2` |

## Website

Recipe Optimizer page provides **Production**, **Research**, and **Compare Both** modes. Production endpoint is never overwritten.
