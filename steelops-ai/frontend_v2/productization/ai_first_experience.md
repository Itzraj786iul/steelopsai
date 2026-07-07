# AI First Experience — Sprint 3

SteelOps AI is an **operating system**, not a dashboard. Every screen answers **"What should I do next?"**

## Principles

1. **Mission before metrics** — Today opens on Today's Mission, not KPI tables
2. **Workflow navigation** — Today → Mission → Live → Planning → Plant → Learning → Admin
3. **Decision modes** — Operator, Shift Incharge, Plant Manager, Executive (language + density)
4. **Plain language** — Heat time not AT; How certain is AI? not confidence tier
5. **Coach, not charts** — Live heat shows AI Coach guidance first
6. **Celebrate execution** — Approval, heat complete, recommendation accepted

## Key surfaces

| Surface | Route | Experience |
|---------|-------|------------|
| Today's Mission | `/dashboard` | Hero, AI briefing, mission cards, priority queue |
| Mission workspace | `/copilot` | Full intelligence + expandable recommendations |
| Live + AI Coach | `/live/[id]` | Focus mode: objective, coach, timer, checklist |
| Mission Control | `/insights/control-tower` | Timeline, plant status, priority queue |
| Executive | `/executive` | Money, minutes, ROI, bottlenecks |
| Learning | `/knowledge/lessons` | Plant intelligence timeline |

## Decision modes

Stored in `decision-mode-store` (persisted). Affects:

- Schedule table visibility (minimal = hidden)
- Priority queue visibility
- Header switcher + focus mode toggle

## Micro-interactions

`CelebrationOverlay` triggered on:

- Recipe approval
- Heat completion (minutes saved)
- Recommendation accepted (live coach)

## Default entry

Login and `/` redirect to **`/dashboard`** (Today's Mission).

## APIs

No backend changes. All mission scores derived from existing schedule + heat + preheat package data.
